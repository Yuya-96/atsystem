const API_BASE = 'https://api.transit.ls8h.com/api/v1';

async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`経路検索APIでエラーが発生しました（${response.status}）。`);
  }

  return response.json();
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatMinutes(seconds) {
  if (!Number.isFinite(Number(seconds))) return '—';
  return `${Math.round(Number(seconds) / 60)}分`;
}

function journeySummary(journey) {
  const transitLegs = (journey.legs || []).filter(leg => leg.kind === 'transit');
  const names = [];

  (journey.legs || []).forEach(leg => {
    if (!names.length && leg.from?.name) names.push(leg.from.name);
    if (leg.to?.name && names[names.length - 1] !== leg.to.name) {
      names.push(leg.to.name);
    }
  });

  return {
    routeText: names.join(' → '),
    routeNames: [...new Set(transitLegs.map(leg => leg.routeName).filter(Boolean))],
    modes: [...new Set(transitLegs.map(leg => leg.mode).filter(Boolean))]
  };
}

export function createTransportationEditor(container, initialValue = null) {
  container.innerHTML = `
    <div class="transport-editor">
      <div class="transport-stations">
        <label class="transport-field">
          乗車駅
          <input type="text" class="transport-from" placeholder="例：横浜" autocomplete="off">
          <div class="station-suggestions from-suggestions" role="listbox"></div>
        </label>
        <label class="transport-field">
          降車駅
          <input type="text" class="transport-to" placeholder="例：鴨居" autocomplete="off">
          <div class="station-suggestions to-suggestions" role="listbox"></div>
        </label>
      </div>

      <label class="transport-mode-option">
        <input type="checkbox" class="transport-include-bus">
        バスを含む経路も検索する
      </label>
      <button type="button" class="transport-search">経路候補を検索</button>
      <p class="transport-status helper" aria-live="polite">初期設定は鉄道のみで検索します。バスを利用した場合はチェックを入れてください。</p>
      <div class="transport-results"></div>

      <div class="transport-selected" hidden>
        <div class="transport-selected-title">選択した経路</div>
        <div class="transport-selected-route"></div>
        <div class="transport-selected-lines helper"></div>
      </div>

      <div class="transport-fare-grid">
        <label class="transport-field">
          片道運賃（円）
          <input type="number" class="transport-fare" min="0" step="1" inputmode="numeric" placeholder="経路選択後に自動入力">
        </label>
        <label class="transport-field">
          利用区分
          <select class="transport-trip-type">
            <option value="round">往復</option>
            <option value="oneway">片道</option>
          </select>
        </label>
      </div>

      <div class="transport-total-row">
        <span>交通費合計</span>
        <strong class="transport-total">—</strong>
      </div>
      <p class="transport-note">運賃情報が取得できない場合は、片道運賃を手入力できます。検索結果は参考情報です。実際の運賃と異なる場合は修正してください。</p>
      <p class="transport-credit">経路候補：<a href="https://api.transit.ls8h.com/" target="_blank" rel="noopener">Transit API</a>（非公式の公共交通データ）</p>
    </div>
  `;

  const fromInput = container.querySelector('.transport-from');
  const toInput = container.querySelector('.transport-to');
  const fromSuggestions = container.querySelector('.from-suggestions');
  const toSuggestions = container.querySelector('.to-suggestions');
  const searchButton = container.querySelector('.transport-search');
  const includeBus = container.querySelector('.transport-include-bus');
  const status = container.querySelector('.transport-status');
  const results = container.querySelector('.transport-results');
  const selectedBox = container.querySelector('.transport-selected');
  const selectedRouteText = container.querySelector('.transport-selected-route');
  const selectedLines = container.querySelector('.transport-selected-lines');
  const fareInput = container.querySelector('.transport-fare');
  const tripType = container.querySelector('.transport-trip-type');
  const totalDisplay = container.querySelector('.transport-total');
  const creditDisplay = container.querySelector('.transport-credit');

  let fromPlace = null;
  let toPlace = null;
  let selectedJourney = null;
  let fromAbort = null;
  let toAbort = null;
  let searchAbort = null;
  let searchSequence = 0;
  let feedsCache = null;

  function updateTotal() {
    const fare = Number(fareInput.value);
    if (fareInput.value === '' || !Number.isFinite(fare) || fare < 0) {
      totalDisplay.textContent = '—';
      return;
    }

    const total = fare * (tripType.value === 'round' ? 2 : 1);
    totalDisplay.textContent = `${total.toLocaleString('ja-JP')}円`;
  }

  function clearSelectedRoute() {
    selectedJourney = null;
    selectedBox.hidden = true;
    selectedRouteText.textContent = '';
    selectedLines.textContent = '';
    results.replaceChildren();
    fareInput.value = '';
    updateTotal();
  }

  function showSuggestions(input, list, places, onSelect) {
    list.replaceChildren();

    if (!places.length) {
      list.hidden = true;
      return;
    }

    places.forEach(place => {
      const button = createElement('button', 'station-suggestion');
      button.type = 'button';
      button.appendChild(createElement('strong', '', place.name));

      const detail = [place.description, place.feedName]
        .filter(Boolean)
        .join(' · ');
      if (detail) button.appendChild(createElement('small', '', detail));

      button.addEventListener('click', () => {
        input.value = place.name;
        onSelect(place);
        list.replaceChildren();
        list.hidden = true;
      });

      list.appendChild(button);
    });

    list.hidden = false;
  }

  async function suggest(input, list, side) {
    const query = input.value.trim();
    if (!query) {
      list.replaceChildren();
      list.hidden = true;
      if (side === 'from') fromPlace = null;
      else toPlace = null;
      return;
    }

    if (side === 'from' && fromAbort) fromAbort.abort();
    if (side === 'to' && toAbort) toAbort.abort();

    const controller = new AbortController();
    if (side === 'from') fromAbort = controller;
    else toAbort = controller;

    try {
      // 駅名専用の候補APIを利用する（バス停・施設などを候補に混ぜない）。
      const url = new URL(API_BASE + '/locations/suggest');
      url.searchParams.set('q', query);
      url.searchParams.set('limit', '8');
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`駅名候補の取得に失敗しました（${response.status}）。`);
      }
      const data = await response.json();
      if (input.value.trim() !== query) return;

      // locations/suggest は places ではなく stations を返す。
      // 経路検索で利用する endpoint には feed 修飾子付き station id を渡す。
      const places = (data.stations || []).map(station => ({
        id: station.id,
        endpoint: station.id,
        name: station.name,
        description: station.nameKana || '',
        feedName: station.feedName,
        feedId: station.feedId,
        kind: station.kind
      }));

      showSuggestions(input, list, places, place => {
        if (side === 'from') fromPlace = place;
        else toPlace = place;
        clearSelectedRoute();
        status.textContent = '乗車駅・降車駅を選択したら経路候補を検索してください。';
      });

      if (!places.length) {
        status.textContent = `「${query}」に一致する駅候補が見つかりませんでした。駅名を確認してください。`;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        list.replaceChildren();
        list.hidden = true;
        status.textContent = `${error.message} 時間をおいて再度入力してください。`;
      }
    }
  }

  fromInput.addEventListener('input', () => {
    fromPlace = null;
    clearSelectedRoute();
    suggest(fromInput, fromSuggestions, 'from');
  });

  toInput.addEventListener('input', () => {
    toPlace = null;
    clearSelectedRoute();
    suggest(toInput, toSuggestions, 'to');
  });

  document.addEventListener('click', event => {
    if (!fromSuggestions.contains(event.target) && event.target !== fromInput) {
      fromSuggestions.hidden = true;
    }
    if (!toSuggestions.contains(event.target) && event.target !== toInput) {
      toSuggestions.hidden = true;
    }
  });

  async function selectJourney(journey, index) {
    selectedJourney = journey;
    const summary = journeySummary(journey);
    selectedBox.hidden = false;
    selectedRouteText.textContent = summary.routeText || `${fromInput.value} → ${toInput.value}`;
    selectedLines.textContent = summary.routeNames.length
      ? `利用路線：${summary.routeNames.join('・')}`
      : '利用路線情報なし';

    const fare = journey.fare || {};
    const selectedFare = fare.ic ?? fare.ticket;
    fareInput.value = Number.isFinite(Number(selectedFare)) ? Number(selectedFare) : '';
    fareInput.dataset.fareType = fare.ic !== undefined ? 'IC' : (fare.ticket !== undefined ? 'きっぷ' : '手入力');

    results.querySelectorAll('.route-option').forEach((card, cardIndex) => {
      card.classList.toggle('selected', cardIndex === index);
    });

    status.textContent = '経路を選択しました。必要に応じて片道運賃を修正してください。';
    updateTotal();

    // 利用した交通データの帰属表示を可能な範囲で追加する。
    try {
      if (!feedsCache) feedsCache = await apiGet('/feeds');
      const feedIds = new Set((journey.legs || []).flatMap(leg => [
        leg.from?.id,
        leg.to?.id
      ]).filter(Boolean).map(id => id.split(':')[0]));
      const attributions = (feedsCache.feeds || [])
        .filter(feed => feedIds.has(feed.feedId))
        .map(feed => feed.attribution || `${feed.name}（${feed.license || 'ライセンス情報'}）`)
        .filter(Boolean);

      if (attributions.length) {
        creditDisplay.textContent = `経路検索：Transit API ／ データ出典：${[...new Set(attributions)].join('、')}`;
      }
    } catch {
      // 帰属情報の追加取得に失敗しても、経路選択・保存は継続できる。
    }
  }

  searchButton.addEventListener('click', async () => {
    const fromName = fromInput.value.trim();
    const toName = toInput.value.trim();

    if (!fromName || !toName) {
      status.textContent = '乗車駅と降車駅を入力してください。';
      return;
    }

    if (!fromPlace || !toPlace) {
      status.textContent = '駅名候補から乗車駅・降車駅をそれぞれ選択してください。';
      return;
    }

    if (fromPlace.endpoint === toPlace.endpoint) {
      status.textContent = '乗車駅と降車駅が同じです。別の駅を選択してください。';
      return;
    }

    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    const sequence = ++searchSequence;

    searchButton.disabled = true;
    results.replaceChildren();
    clearSelectedRoute();
    status.textContent = '経路を検索しています…';

    try {
      const today = new Date();
      const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const data = await apiGet('/plan', {
        from: fromPlace.endpoint,
        to: toPlace.endpoint,
        fromLabel: fromPlace.name,
        toLabel: toPlace.name,
        date,
        time: '12:00',
        type: 'departure',
        allowModes: includeBus.checked ? 'rail,bus' : 'rail',
        maxTransfers: 4,
        numItineraries: 6
      });

      if (sequence !== searchSequence) return;

      const journeys = data.journeys || [];
      if (!journeys.length) {
        status.textContent = includeBus.checked
          ? '経路候補が見つかりませんでした。駅名を変えて再検索するか、運賃を手入力してください。'
          : '鉄道の経路候補が見つかりませんでした。バスも利用した場合は「バスを含む経路も検索する」にチェックして再検索してください。';
        return;
      }

      journeys.forEach((journey, index) => {
        const summary = journeySummary(journey);
        const card = createElement('div', 'route-option');
        const heading = createElement('div', 'route-option-heading');
        heading.appendChild(createElement('strong', '', `候補 ${index + 1}`));

        const fare = journey.fare || {};
        const fareValue = fare.ic ?? fare.ticket;
        const fareLabel = fare.ic !== undefined ? 'IC運賃' : (fare.ticket !== undefined ? 'きっぷ運賃' : '運賃情報なし');
        heading.appendChild(createElement('span', 'route-fare', fareValue === undefined ? fareLabel : `${Number(fareValue).toLocaleString('ja-JP')}円（${fareLabel}）`));
        card.appendChild(heading);

        card.appendChild(createElement('div', 'route-path', summary.routeText || `${fromPlace.name} → ${toPlace.name}`));
        if (summary.routeNames.length) {
          card.appendChild(createElement('div', 'route-lines', summary.routeNames.join('・')));
        }

        const meta = `${formatMinutes(journey.durationSecs)} / 乗換 ${Number(journey.transferCount) || 0}回`;
        card.appendChild(createElement('div', 'route-meta', meta));

        const selectButton = createElement('button', 'route-select-button', 'この経路を選択');
        selectButton.type = 'button';
        selectButton.addEventListener('click', () => selectJourney(journey, index));
        card.appendChild(selectButton);
        results.appendChild(card);
      });

      status.textContent = `${journeys.length}件の${includeBus.checked ? '鉄道・バス' : '鉄道'}経路候補が見つかりました。実際に利用した経路を選択してください。`; 
    } catch (error) {
      if (error.name !== 'AbortError') {
        status.textContent = `${error.message} 駅名と運賃を手入力して登録することもできます。`;
      }
    } finally {
      if (sequence === searchSequence) searchButton.disabled = false;
    }
  });

  fareInput.addEventListener('input', updateTotal);
  tripType.addEventListener('change', updateTotal);

  function setInitial(value) {
    if (!value) return;

    fromInput.value = value.departure || '';
    toInput.value = value.arrival || '';
    fareInput.value = value.oneWayFare ?? '';
    tripType.value = value.tripType || 'round';
    fareInput.dataset.fareType = value.fareType || '手入力';

    if (value.routeText) {
      selectedRouteText.textContent = value.routeText;
      selectedLines.textContent = value.routeNames?.length
        ? `利用路線：${value.routeNames.join('・')}`
        : '保存済みの経路';
      selectedBox.hidden = false;
    }

    updateTotal();
  }

  setInitial(initialValue);

  return {
    validate() {
      const departure = fromInput.value.trim();
      const arrival = toInput.value.trim();
      const fare = fareInput.value;

      if (!departure || !arrival) {
        return '交通費の乗車駅・降車駅を入力してください。';
      }
      if (fare === '' || !Number.isFinite(Number(fare)) || Number(fare) < 0) {
        return '片道運賃を入力してください。経路検索で取得するか、手入力してください。';
      }
      return null;
    },

    getValue() {
      const fare = Number(fareInput.value);
      const trip = tripType.value;
      const summary = selectedJourney ? journeySummary(selectedJourney) : null;
      const fareInfo = selectedJourney?.fare || {};

      return {
        departure: fromInput.value.trim(),
        arrival: toInput.value.trim(),
        routeText: summary?.routeText || selectedRouteText.textContent || `${fromInput.value.trim()} → ${toInput.value.trim()}`,
        routeNames: summary?.routeNames || [],
        modes: summary?.modes || [],
        oneWayFare: Math.round(fare),
        fareType: fareInput.dataset.fareType || (fareInfo.ic !== undefined ? 'IC' : (fareInfo.ticket !== undefined ? 'きっぷ' : '手入力')),
        tripType: trip,
        totalFare: Math.round(fare * (trip === 'round' ? 2 : 1)),
        source: selectedJourney ? 'Transit API' : 'manual',
        transferCount: selectedJourney ? Number(selectedJourney.transferCount) || 0 : null,
        durationSecs: selectedJourney ? Number(selectedJourney.durationSecs) || null : null
      };
    },

    reset() {
      fromInput.value = '';
      toInput.value = '';
      fromPlace = null;
      toPlace = null;
      selectedJourney = null;
      fareInput.value = '';
      fareInput.dataset.fareType = '';
      tripType.value = 'round';
      results.replaceChildren();
      selectedBox.hidden = true;
      fromSuggestions.replaceChildren();
      toSuggestions.replaceChildren();
      status.textContent = '駅名を入力して候補を選択してください。';
      updateTotal();
    }
  };
}
