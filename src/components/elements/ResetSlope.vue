<script setup lang="ts">
const resetEl = ref<HTMLSelectElement>()

useListen('modal:pointDragged', () => {
  if (resetEl.value && resetEl.value!.value !== 'Reset Slope') {
    resetEl.value!.value = 'Reset Slope'
  }
})

const reset = (e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  const mapbox = useMapbox()
  mapbox.value.settings.littArray = JSON.parse(JSON.stringify(littoralArray[value]))
  useEvent('modal:changeLittArray')
}
</script>


<template>
  <div id="reset-slope">
    <span class="select-label">
      <select ref="resetEl" class="select-input" name="reset" @change="reset">
        <option hidden disabled selected class="msg">Reset Slope</option>
        <option value="linear">Linear</option>
        <option value="sine">Sine</option>
        <option value="cubic">Cubic</option>
        <option value="quint">Quint</option>
      </select>
    </span>
  </div>
</template>


<style lang="scss" scoped>
.select-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 7.5rem;
  &::after {
    position: absolute;
    right: .5rem;
    width: .625rem;
    height: .4375rem;
    background-color: $textAlt;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    content: '';
    pointer-events: none;
  }
}
.select-input {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  overflow: hidden;
  display: block;
  width: 7.5rem;
  border-radius: .25rem;
  color: $textColor;
  padding-left: .5rem;
  height: 2em;
  line-height: 2;
  background-color: $inputBg;
  font-size: 1em;
  cursor: pointer;
  &:active, &:focus {
    background-color: $inputBgF;
  }
  option {
    background: $optionTagColor;
  }
}
</style>
