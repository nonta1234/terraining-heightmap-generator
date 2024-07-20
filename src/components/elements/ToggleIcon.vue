<script setup lang="ts">
interface Props {
  name: string;
  modelValue?: boolean;
  value?: boolean;
  icon: string[];
  checkedIcon?: string[];
  iconClass?: string;
  checkedIconClass?: string;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue' | 'change', newValue: boolean): void;
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const nInput = ref<HTMLInputElement>()

const _value = computed(() => typeof props.modelValue === 'undefined' ? props.value : props.modelValue)

watch(() => props.disabled, () => {
  if (props.disabled) {
    nInput.value?.setAttribute('disabled', '')
  } else {
    nInput.value?.removeAttribute('disabled')
  }
})

const toggle = () => {
  emit('update:modelValue', !_value.value)
  emit('change', !_value.value)
}
</script>


<template>
  <div class="toggle-icon">
    <input :id="name" ref="nInput" class="input" type="checkbox" :checked="_value" tabindex="-1" @change="toggle">
    <label :for="name" class="label" tabindex="0" @keydown.enter="toggle" @keydown.space="toggle">
      <template v-if="checkedIcon">
        <font-awesome-icon v-show="!_value" :icon="icon" :class="iconClass" />
        <font-awesome-icon v-show="_value" :icon="checkedIcon" :class="checkedIconClass" />
      </template>
      <template v-else>
        <font-awesome-icon :icon="icon" :class="iconClass" />
      </template>
    </label>
  </div>
</template>


<style lang="scss" scoped>
.input {
  display: none;
}
.input:checked + .label {
  color: $textColor;
}
.input:disabled + .label {
  display: none;
}
.label {
  display: block;
  color: $textDisabled;
  cursor: pointer;
  outline: none;
  &:focus {
    svg {
      filter: drop-shadow(0px 0px 3px rgba(0, 0, 0, .9));
    }
  }
}
</style>
