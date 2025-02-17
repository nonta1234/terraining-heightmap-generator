<script setup lang="ts">
interface Props {
  name: string
  modelValue?: boolean
  value?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue' | 'change', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const _value = computed(() => props.modelValue === undefined ? props.value : props.modelValue)

const toggle = () => {
  emit('update:modelValue', !_value.value)
  emit('change', !_value.value)
}
</script>

<template>
  <div class="toggle-switch">
    <input :id="props.name" class="input" type="checkbox" :checked="_value" tabindex="-1" :disabled="props.disabled" @change="toggle">
    <label :for="props.name" class="label" tabindex="0" :disabled="props.disabled" @keydown.enter="toggle" @keydown.space="toggle"></label>
  </div>
</template>

<style lang="scss" scoped>
.toggle-switch {
  display: table;
}

.input {
  display: none;

  &:checked + .label {
    background-color: rgba(255, 255, 255, .2);

    &:focus {
      outline: solid 1px #DFE5E8;
    }

    &::before {
      left: calc(100% - 1.3125rem);
      background-color: #DFE5E8;
    }
  }

  &:disabled + .label {
    background-color: $inputBg;

    &::before {
      background-color: transparent;
    }
  }
}

.label {
  display: block;
  position: relative;
  width: 3rem;
  height: 1.5rem;
  border-radius: .75rem;
  background-color: $inputBg;
  cursor: pointer;
  outline: none;

  &:focus {
    outline: solid 1px $borderColor;
    background-color: $inputBgF;
  }

  &::before {
    position: absolute;
    top: .1875rem;
    left: .1875rem;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: .5625rem;
    background-color: $borderColor;
    transition: .3s;
    content: "";
  }
}
</style>
