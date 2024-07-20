<script setup lang="ts">
interface Props {
  modelValue?: number;
  value?: number;
  step?: number;
  max?: number;
  min?: number;
  disabled?: boolean;
  textHidden?: boolean;
}

interface Emits {
  (e: 'input'): void;
  (e: 'update:modelValue' | 'change', newValue: number): void;
}

const nInput = ref<HTMLInputElement>()

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  value: undefined,
  step: 1,
  max: 1,
  min: 0,
  disabled: false,
  textHidden: false,
})

const emit = defineEmits<Emits>()

watch(() => props.disabled, () => {
  if (props.disabled) {
    nInput.value?.setAttribute('disabled', '')
  } else {
    nInput.value?.removeAttribute('disabled')
  }
})

let isComposing = false

const _value = ref(props.value ?? props.modelValue ?? 0)

const decimalPart = props.step.toString().split('.')[1]
const decimalDigits = (decimalPart && decimalPart.length) ? decimalPart.length : 0
const scale = Math.pow(10, decimalDigits)

const filter = (src: string) => {
  return src
    .replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 65248)
    })
    .replace(/[‐－―ー]/g, '-')
    .replace(/[^\-\d.]/g, '')
    .replace(/(?!^-)[^\d.]/g, '')
}

const displayText = computed({
  get: () => props.textHidden ? '' : ((props.value ?? props.modelValue) || 0).toFixed(decimalDigits),
  set: (val) => {
    const str = filter(val)
    _value.value = parseFloat(str)
    nInput.value!.value = str
  },
})

const onFocus = () => {
  _value.value = props.value ?? props.modelValue ?? 0
}

const onInput = () => {
  if (!isComposing) {
    displayText.value = nInput.value!.value
  }
  nInput.value?.setAttribute('input', '')
  emit('input')
}

const onCompositionStart = () => {
  isComposing = true
}

const onCompositionEnd = async () => {
  await new Promise(resolve => setTimeout(() => {
    resolve(displayText.value = nInput.value!.value)
  }, 0))
  isComposing = false
}

const handleChange = (value: number) => {
  const prevValue = (props.value ?? props.modelValue) || 0
  let tmpValue = value
  if (isNaN(tmpValue)) {
    displayText.value = prevValue!.toFixed(decimalDigits)
  } else {
    if (tmpValue > props.max) { tmpValue = props.max }
    if (tmpValue < props.min) { tmpValue = props.min }
    if (props.step > 1) {
      tmpValue = Math.round(Math.round(tmpValue * scale) / scale / props.step) * props.step
    } else {
      tmpValue = Math.round(tmpValue * scale) / scale
    }
    displayText.value = tmpValue.toFixed(decimalDigits)
  }
  nInput.value?.removeAttribute('input')
  emit('update:modelValue', _value.value)
  emit('change', _value.value)
}

const onChange = () => {
  if (!isComposing) {
    handleChange(parseFloat(filter(nInput.value!.value)))
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (!isComposing) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      _value.value += props.step
      handleChange(_value.value)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      _value.value -= props.step
      handleChange(_value.value)
    }
  }
}
</script>


<template>
  <input
    ref="nInput"
    class="number-input"
    :value="displayText"
    type="text"
    inputmode="decimal"
    enterkeyhint="done"
    :disabled="disabled"
    @input="onInput"
    @focus="onFocus"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
    @keydown="onKeydown"
    @keydown.enter="onChange"
    @blur="onChange"
  />
</template>


<style lang="scss" scoped>
.number-input {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  overflow: hidden;
  text-overflow: clip;
  font-feature-settings: "tnum";
}
</style>
