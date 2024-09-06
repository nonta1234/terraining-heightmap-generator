<script setup lang="ts">
const resetType = ref('')

useListen('modal:pointDragged', () => {
  resetType.value = ''
})

const reset = () => {
  const mapbox = useMapbox()
  mapbox.value.settings.littArray = JSON.parse(JSON.stringify(littoralArray[resetType.value]))
  useEvent('modal:changeLittArray')
}
</script>

<template>
  <SelectMenu
    id="reset-slope"
    v-model="resetType"
    class="box"
    placeholder="Reset Slope"
    :options="[
      { value: 'linear', label: 'Linear' },
      { value: 'sine', label: 'Sine' },
      { value: 'cubic', label: 'Cubic' },
      { value: 'quint', label: 'Quint' },
    ]"
    @change="reset"
  />
</template>

<style lang="scss" scoped>
  .box {
    width: 7.5rem !important;
    line-height: 1.875 !important;
  }
</style>
