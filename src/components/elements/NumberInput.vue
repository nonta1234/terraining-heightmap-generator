<script lang="ts">
export default defineComponent({
  inheritAttrs: false,
})
</script>

<script setup lang="ts">
interface Props {
  value?: number
  modelValue?: number
  step?: number
  max?: number
  min?: number
  disabled?: boolean
  inputId?: string
  inputClass?: string
  textHidden?: boolean
  unit?: string
}

interface Emits {
  (e: 'input'): void
  (e: 'update:modelValue' | 'change', value: number): void
}

const nInput = ref<HTMLInputElement>()

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  modelValue: undefined,
  step: 1,
  max: 9999,
  min: 0,
  disabled: false,
  inputId: undefined,
  inputClass: undefined,
  textHidden: false,
  unit: '',
})

const emit = defineEmits<Emits>()

let isComposing = false

function omit<T extends Record<string, any>, K extends keyof T>(
  object: T,
  keysToOmit: K[] | any[],
): Pick<T, Exclude<keyof T, K>> {
  const result = { ...object }

  for (const key of keysToOmit) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete result[key]
  }

  return result
}

const $attrs = useAttrs()
const attrs = computed(() => omit($attrs, ['class']))

const displayText = computed(() => props.textHidden ? '' : ((props.modelValue ?? props.value) || 0).toFixed(decimalDigits))
const inputValue = ref((props.modelValue ?? props.value) || 0)

const decimalPart = props.step.toString().split('.')[1]
const decimalDigits = (decimalPart && decimalPart.length) ? decimalPart.length : 0
const scale = 10 ** decimalDigits

const filter = (src: string) => {
  return src
    .replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 65248)
    })
    .replace(/[‐－―ー]/g, '-')
    .replace(/[^\-\d.]/g, '')
    .replace(/(?!^-)[^\d.]/g, '')
}

const onInput = () => {
  if (!isComposing) {
    inputValue.value = parseFloat(filter(nInput.value!.value))
  }
  nInput.value?.setAttribute('input', '')
  emit('input')
}

const onCompositionStart = () => {
  isComposing = true
}

const onCompositionEnd = async () => {
  await new Promise(resolve => setTimeout(() => {
    resolve(inputValue.value = parseFloat(filter(nInput.value!.value)))
  }, 0))
  isComposing = false
}

const handleChange = (value: number) => {
  const prevValue = (props.modelValue ?? props.value) || 0
  let tmpValue = value
  if (isNaN(tmpValue)) {
    inputValue.value = prevValue
  } else {
    if (tmpValue > props.max) { tmpValue = props.max }
    if (tmpValue < props.min) { tmpValue = props.min }
    if (props.step > 1) {
      tmpValue = Math.round(Math.round(tmpValue * scale) / scale / props.step) * props.step
    } else {
      tmpValue = Math.round(tmpValue * scale) / scale
    }
    inputValue.value = tmpValue
  }
  nInput.value!.value = inputValue.value.toFixed(decimalDigits)
  nInput.value?.removeAttribute('input')
  emit('update:modelValue', inputValue.value)
  emit('change', inputValue.value)
}

const onChange = () => {
  if (!isComposing && nInput.value) {
    handleChange(parseFloat(filter(nInput.value!.value)))
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (!isComposing) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      inputValue.value += props.step
      handleChange(inputValue.value)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      inputValue.value -= props.step
      handleChange(inputValue.value)
    }
  }
}
</script>

<template>
  <div :class="['input-wrapper', $attrs['class']]">
    <input
      :id="props.inputId"
      ref="nInput"
      :value="displayText"
      type="text"
      inputmode="decimal"
      enterkeyhint="done"
      class="input"
      :class="props.inputClass"
      :disabled="props.disabled"
      v-bind="attrs"
      :step="props.step"
      :max="props.max"
      :min="props.min"
      @input="onInput"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
      @keydown="onKeydown"
      @keydown.enter="onChange"
      @blur="onChange"
    />
    <span v-if="unit !== '' && !props.textHidden" class="unit">{{ unit }}</span>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.input-wrapper {
  display: flex;
}
.input {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  overflow: hidden;
  text-overflow: clip;
  font-feature-settings: "tnum";
  flex: 1 1 100%;
  background-color: transparent;
  width: 100%;
}
.unit {
  flex: 0 0 fit-content;
  background-color: transparent;
}
</style>
