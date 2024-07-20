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
const isValid = ref(isTokenValid())
const hasUserStyle = computed(() => mapbox.value.settings.userStyleURL !== '')
const accessToken = computed(() => mapbox.value.settings.accessToken)

watch(accessToken, () => {
  isValid.value = isTokenValid()
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

defineExpose({
  startIconRotation,
  stopIconRotation,
})
</script>


<template>
  <div class="select-button">
    <button ref="buttonEl" class="btn" tabindex="-1">
      <slot />
    </button>
    <select ref="selectEl" class="select-input" @focus="resetSelect" @blur="resetSelect">
      <option value="" disabled>{{ '--Select Style--' + (device.isFirefox ? '' : '&nbsp;') }}</option>
      <option v-for="item in props.list" :key="item.value" :value="item.value">{{ item.text }}</option>
      <option v-if="hasUserStyle" value="user">User Style</option>
      <template v-if="isValid">
        <option class="disabled-line" disabled>{{ '───────' + (device.isFirefox ? '' : '&nbsp;') }}</option>
        <hr>
        <option value="customize">{{ 'Customize Map' + (device.isFirefox ? '' : '&nbsp;') }}</option>
      </template>
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
  .select-input {
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
    option {
      background: $optionTagColor;
      color: $textColor;
      font-size: 1rem;
      &:first-child {
        color: $textDisabled;
      }
    }
  }
  .btn {
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
  .disabled-line {
    color: $textDisabled;
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
  hr {
    display: block;
    height: 1rem;
  }
</style>
