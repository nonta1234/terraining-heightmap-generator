<script setup lang="ts">
interface Props {
  modal: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modal: false,
})

const resetEl = ref<HTMLSelectElement>()

const close = () => {
  useEvent('map:leModal', false)
}

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
  <ModalWindow :modal="props.modal">
    <div id="littoral-editor">
      <h3>Littoral Editor</h3>
      <CloseButton class="close" @click="close" />
      <GridCanvas />
      <div class="footer">
        <label class="select">
          <select ref="resetEl" name="reset" @change="reset">
            <option hidden disabled selected class="msg">Reset Slope</option>
            <option value="linear">Linear</option>
            <option value="sine">Sine</option>
            <option value="cubic">Cubic</option>
            <option value="quint">Quint</option>
          </select>
        </label>
      </div>
    </div>
  </ModalWindow>
</template>


<style lang="scss" scoped>
  #littoral-editor {
    position: relative;
  }
  h3 {
    font-size: 1rem;
    text-align: center;
    font-weight: 700;
    height: 2rem;
    margin-bottom: .5rem;
    line-height: 2;
  }
  .close {
    position: absolute;
    top: 6px;
    right: 6px;
  }
  .footer {
    display: flex;
    padding: 0 1rem 1rem;
    justify-content: space-between;
    position: relative;
  }
  button, select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
    flex-shrink: 0;
  }
  select {
    width: 8rem;
    border-radius: .25rem;
    color: $textColor;
    padding-left: .5rem;
    height: 2.25rem;
    line-height: 2.25;
    background-color: $inputBg;
    font-size: 1rem;
    cursor: pointer;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  .select {
    position: relative;
    display: inline-flex;
    align-items: center;
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
  option {
    background: $optionTagColor;
  }
</style>
