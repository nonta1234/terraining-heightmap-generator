<script setup lang="ts">
interface Props {
  modelValue?: number;
  value?: number;
  step?: number
  max?: number;
  min?: number;
  disabled?: boolean;
}

interface Emits {
  (e: 'input'): void;
  (e: 'update:modelValue', newValue: number): void;
  (e: 'change', newValue: number): void;
}

const nInput = ref<HTMLInputElement>()

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  value: undefined,
  step: 1,
  max: 1,
  min: 0,
  disabled: false,
})

const emit = defineEmits<Emits>()

watch(() => props.disabled, () => {
  if (props.disabled) {
    nInput.value?.setAttribute('disabled', '')
  } else {
    nInput.value?.removeAttribute('disabled')
  }
})

const decimalPart = computed(() => props.step.toString().split('.')[1]).value
const decimalDigits = (decimalPart && decimalPart.length) ? decimalPart.length : 0
const scale = Math.pow(10, decimalDigits)

const toDisplayValue = (value: number) => {
  return Math.round(value * scale) / scale
}

const _value = ref()

const displayValue = computed({
  get: () => toDisplayValue((typeof props.modelValue === 'undefined' ? props.value : props.modelValue) as number),
  set: (val) => { _value.value = val },
})

const handleFocus = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  _value.value = parseFloat(value)
}

const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  if (!Number.isNaN(parseFloat(value))) {
    displayValue.value = parseFloat(value)
  }
  nInput.value?.setAttribute('input', '')
  emit('input')
}

const handleChange = () => {
  const oldValue = (typeof props.modelValue === 'undefined' ? props.value : props.modelValue) as number
  if (_value.value > props.max) { _value.value = props.max }
  if (_value.value < props.min) { _value.value = props.min }
  if (!Number.isNaN(_value.value)) {
    displayValue.value = toDisplayValue(_value.value)
  } else {
    displayValue.value = toDisplayValue(oldValue)
  }
  nInput.value!.value = String(toDisplayValue(oldValue))
  nInput.value?.removeAttribute('input')
  emit('update:modelValue', _value.value)
  emit('change', _value.value)
}
</script>


<template>
  <input
    ref="nInput"
    :value="displayValue"
    type="number"
    :max="max"
    :min="min"
    :step="step"
    @focus="handleFocus"
    @input="handleInput"
    @keydown.enter="handleChange"
    @blur="handleChange"
  />
</template>


<style lang="scss" scoped>
  input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    text-align: right;
    text-overflow: hidden;
    font-feature-settings: "tnum";
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none !important;
    margin: 0 !important;
    -moz-appearance:textfield !important;
  }
  input[type="number"] {
    -moz-appearance:textfield;
  }
</style>
