<script setup lang="ts">
interface Props {
  list: { text: string, value: string }[];
  icon: [string, string];
  iconClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  list: () => [],
  icon: () => ['', ''],
  iconClass: () => '',
})

const label = ref<HTMLLabelElement>()
const select = ref<HTMLSelectElement>()
const isActive = ref(false)
const isFocus = ref(false)

onMounted(() => {
  select.value!.selectedIndex = -1
})

const startIconRotation = () => {
  label.value?.classList.add('rotate')
}

const stopIconRotation = () => {
  label.value?.classList.remove('rotate')
}

const onMouseenter = () => {
  if (!isFocus.value) {
    isActive.value = true
  }
}

const onMouseleave = () => {
  if (!isFocus.value) {
    isActive.value = false
  }
}

const onFocus = () => {
  isFocus.value = true
  isActive.value = true
  select.value!.selectedIndex = -1
}

const onBlur = () => {
  isFocus.value = false
  isActive.value = false
  select.value!.selectedIndex = -1
}

defineExpose({
  startIconRotation,
  stopIconRotation,
})
</script>


<template>
  <div class="select-button">
    <label ref="label" :class="{ 'is-active': isActive }"><font-awesome-icon :icon="props.icon" :class="props.iconClass" /></label>
    <select
      ref="select"
      @mouseenter="onMouseenter"
      @mouseleave="onMouseleave"
      @focus="onFocus"
      @blur="onBlur"
    >
      <option v-for="item in props.list" :key="item.value" :value="item.value">{{ item.text }}</option>
    </select>
  </div>
</template>


<style lang="scss" scoped>
  .select-button {
    position: relative;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    background-color: transparent;
    color: $textColor;
  }
  label {
    display: block;
    width: 40px;
    height: 40px;
    color: $textColor;
    perspective: 100px;
    text-align: center;
    flex-shrink: 0;
    svg {
      margin: 4px 0;
    }
  }
  select {
    position: absolute;
    top: 0;
    left: 0;
    width: 40px;
    height: 40px;
    opacity: 0;
  }
  option {
    position: relative;
    top: 100px;
  }
  .rotate {
    svg {
      animation: rotateY 2s linear infinite;
    }
  }
  @keyframes rotateY {
    to {
      transform:rotateY(-1turn);
    }
  }
</style>