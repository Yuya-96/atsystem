/**
 * 交通費の手入力欄を作成する。
 * 経路検索や駅名入力は行わず、今回の交通費合計額を直接入力する。
 */
export function createTransportationEditor(container, initialValue = null) {
  container.innerHTML = `
    <div class="transport-editor">
      <label class="transport-field">
        今回の交通費合計（円）
        <input
          type="number"
          class="transport-fare"
          min="0"
          step="1"
          inputmode="numeric"
          placeholder="例：460"
          required
        >
      </label>
      <p class="transport-note">
        片道・往復を含め、今回実際にかかった交通費の合計額を入力してください。
      </p>
    </div>
  `;

  const fareInput = container.querySelector('.transport-fare');

  if (initialValue && initialValue.totalFare !== undefined) {
    fareInput.value = initialValue.totalFare;
  }

  return {
    validate() {
      const value = fareInput.value.trim();

      if (value === '') {
        return '交通費の金額を入力してください。';
      }

      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
        return '交通費は0以上の整数で入力してください。';
      }

      return '';
    },

    getValue() {
      return {
        totalFare: Number(fareInput.value)
      };
    },

    reset() {
      fareInput.value = '';
    }
  };
}
