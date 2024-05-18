<script setup lang="ts">
import type { StyleList } from '~/types/types'
interface Props {
  list: StyleList;
}

const props = withDefaults(defineProps<Props>(), {
  list: () => styleList,
})
const device = useDevice()
const mapbox = useMapbox()
const buttonEl = ref<HTMLInputElement>()
const selectEl = ref<HTMLSelectElement>()
const hasUserStyle = ref(false)

const userStyle = computed(() => mapbox.value.settings.userStyleURL)

watch(userStyle, () => {
  hasUserStyle.value = (userStyle.value !== '')
})

const resetSelect = () => {
  selectEl.value!.selectedIndex = -1
}

const startIconRotation = () => {
  buttonEl.value?.classList.add('rotate')
}

const stopIconRotation = () => {
  buttonEl.value?.classList.remove('rotate')
}

onMounted(() => {
  hasUserStyle.value = (mapbox.value.settings.userStyleURL !== '')
})

defineExpose({
  startIconRotation,
  stopIconRotation,
})
</script>


<template>
  <div class="select-button">
    <button ref="buttonEl" tabindex="-1">
      <slot />
    </button>
    <select
      ref="selectEl"
      @focus="resetSelect"
      @blur="resetSelect"
    >
      <option value="" disabled>{{ '--Select style--' + (device.isFirefox ? '' : '&nbsp;&nbsp;') }}</option>
      <option v-for="item in props.list" :key="item.value" :value="item.value">{{ item.text + (device.isFirefox ? '' : '&nbsp;&nbsp;') }}</option>
      <option v-if="hasUserStyle" value="user">{{ 'User Style' + (device.isFirefox ? '' : '&nbsp;&nbsp;') }}</option>
    </select>
  </div>
</template>


<style lang="scss" scoped>
  .select-button {
    position: relative;
    width: 40px;
    height: 40px;
    background-color: transparent;
    color: $textColor;
  }
  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    position: absolute;
    top: 0;
    left: 0;
    height: 40px;
    width: 40px;
    opacity: 0;
    padding: 8px;
    border: none;
    outline: none;
  }
  option {
    background: $optionTagColor;
    color: $textColor;
    font-size: 1rem;
    &:first-child {
      color: $textDisabled;
    }
  }
  button {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background-color: transparent;
    color: $textColor;
    perspective: 100px;
    text-align: center;
    svg {
      margin: 4px 0;
      fill: currentColor;
    }
    &:has(+ select:hover), &:has(+ select:focus) {
      color: aquamarine;
    }
  }
  .rotate {
    :deep(svg) {
      animation: rotateY 2s linear infinite;
    }
  }
  @keyframes rotateY {
    to {
      transform: rotateY(-1turn);
    }
  }
</style>
