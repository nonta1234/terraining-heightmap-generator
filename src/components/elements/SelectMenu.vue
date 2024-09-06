<script setup lang="ts">
type OptionItem = {
  type?: 'header' | 'divide'
  value?: string | number
  label?: string
}

type DisplayedOption = OptionItem & {
  index?: number
}

type T = string | number | OptionItem

interface DropdownStyle {
  [prop: string]: string
}

interface Props {
  id: string
  menuPosition?: 'normal' | 'right' | 'left'
  menuWidth?: number
  gap?: number
  placeholder?: string
  options: Array<T>
}

const model = defineModel<string | number>()
const emit = defineEmits(['update:modelValue', 'change'])

const props = withDefaults(defineProps<Props>(), {
  id: '',
  menuPosition: 'normal',
  menuWidth: undefined,
  gap: 2,
  placeholder: '',
  options: () => [] as Array<T>,

})

const { isMobile } = useDevice()
const isOpen = ref(false)
const selectedIndex = ref(-1)
const selectedLabel = ref('')
const activeIndex = ref(-1)
const selectMenuContainer = ref<HTMLDivElement>()
const dropdownRef = ref<HTMLDivElement>()

const displayedOptions = computed<DisplayedOption[]>(() => {
  let index = 0
  return props.options.map((option) => {
    if (typeof option === 'object') {
      if (option.type === 'header' || option.type === 'divide') {
        return option
      } else {
        return { ...option, index: index++ }
      }
    } else {
      return { value: option, label: option.toString(), index: index++ }
    }
  })
})

const dataList = computed(() => {
  return displayedOptions.value.filter(option => !option.type)
    .map((option) => { return { value: option.value, label: option.label } })
})

const showPlaceholder = computed(() => selectedLabel.value === props.placeholder)

watch(model, newValue => update(newValue))

const setIndex = (index: number) => {
  const value = index > -1 ? dataList.value[index].value : ''
  emit('update:modelValue', value)
  emit('change', value)
}

const update = (value: string | number | undefined) => {
  let index = dataList.value.length - 1
  for (let i = dataList.value.length - 1; i > -1; i--) {
    if (dataList.value[i].value === value) break
    else index--
  }
  selectedIndex.value = index
  activeIndex.value = index
  selectedLabel.value = index > -1 ? (dataList.value[index].label ?? '') : props.placeholder
}

const setActiveIndex = (index: number | undefined) => {
  if (index !== undefined) {
    activeIndex.value = index
  }
}

const toggleDropdown = async (open?: boolean) => {
  const _open = open !== undefined ? open : !isOpen.value
  isOpen.value = _open
  if (isOpen.value) {
    setActiveIndex(selectedIndex.value)
    await nextTick()
    updateDropdownStyle()
    document.addEventListener('scroll', onScroll)
    document.addEventListener('wheel', onWheelOutside, { passive: false })
  } else {
    document.removeEventListener('scroll', onScroll)
    document.removeEventListener('wheel', onWheelOutside)
  }
}

const onKeydown = async (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, dataList.value.length - 1)
    setIndex(selectedIndex.value)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    setIndex(selectedIndex.value)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (isOpen.value) {
      setIndex(selectedIndex.value)
      await toggleDropdown()
    } else {
      await toggleDropdown()
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    await toggleDropdown(false)
  }
}

const dropdownStyle = ref<DropdownStyle>({})

const updateDropdownStyle = () => {
  if (selectMenuContainer.value && dropdownRef.value) {
    dropdownStyle.value = {}
    const containerRect = selectMenuContainer.value.getBoundingClientRect()
    const dropdownRect = dropdownRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - (props.menuPosition === 'normal' ? containerRect.bottom : containerRect.top) - props.gap
    if (spaceBelow < dropdownRect.height) {
      dropdownStyle.value.bottom = `${props.menuPosition === 'normal' ? (containerRect.height + props.gap) : 0}px`
    } else {
      dropdownStyle.value.top = `${props.menuPosition === 'normal' ? (containerRect.height + props.gap) : 0}px`
    }
    if (props.menuPosition === 'right') {
      dropdownStyle.value.left = `${containerRect.width + props.gap}px`
      if (props.menuWidth) dropdownStyle.value.width = `${props.menuWidth}px`
    }
    if (props.menuPosition === 'left') {
      dropdownStyle.value.right = `-${props.gap}px`
      if (props.menuWidth) dropdownStyle.value.width = `${props.menuWidth}px`
    }
    if (props.menuPosition === 'normal') {
      dropdownStyle.value.width = props.menuWidth ? `${props.menuWidth}px` : `${containerRect.width}px`
    }
  }
}

const onWheelOutside = (e: WheelEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    toggleDropdown(false)
  } else {
    e.preventDefault()
  }
}

const onScroll = () => {
  toggleDropdown(false)
}

const onItemClick = (index: number | undefined) => {
  if (index !== undefined) {
    setIndex(index)
    toggleDropdown(false)
  }
}

const onClick = () => {
  toggleDropdown()
}

const onBlur = () => {
  toggleDropdown(false)
}

onMounted(() => {
  update(model.value)
})

onUnmounted(() => {
  document.removeEventListener('scroll', onScroll)
  document.removeEventListener('wheel', onWheelOutside)
})
</script>

<template>
  <div ref="selectMenuContainer" class="select-menu">
    <!-- for Mobile -->
    <template v-if="isMobile">
      <div class="input-wrapper">
        <select v-model="model">
          <template v-for="(option, index) in displayedOptions" :key="index">
            <option v-if="option.type && option.type === 'header'" class="native-item-header" disabled>{{ option.label }}</option>
            <hr v-else-if="option.type && option.type === 'divide'">
            <option v-else :value="displayedOptions[index].value">
              {{ displayedOptions[index].label }}
            </option>

          </template>
        </select>
      </div>
    </template>

    <!-- for Desktop -->
    <template v-else>
      <button
        :id="id"
        class="select-menu-box"
        role="button"
        :aria-expanded="isOpen"
        :aria-controls="isOpen ? `${id}-listbox` : undefined"
        aria-haspopup="listbox"
        @keydown="onKeydown"
        @blur="onBlur"
      >
        <span v-if="$slots.icon" class="select-menu-icon" @click="onClick">
          <slot name="icon"></slot>
        </span>
        <span v-else :class="{'selected-item': true, 'placeholder': showPlaceholder }" :aria-label="selectedLabel" @click="onClick">
          {{ selectedLabel }}
        </span>
      </button>
      <!-- dropdown -->
      <transition name="fade">
        <div v-if="isOpen" :id="`${id}-listbox`" ref="dropdownRef" class="dropdown-menu" role="listbox" :style="dropdownStyle">
          <template v-for="(option, index) in displayedOptions" :key="index">
            <h6 v-if="option.type && option.type === 'header'" class="item-header">{{ option.label }}</h6>
            <hr v-else-if="option.type && option.type === 'divide'" class="divide">
            <div v-else
              :id="`${id}-option-${option.value}`"
              role="option"
              :aria-selected="option.index === selectedIndex"
              tabindex="-1"
              :class="{ 'dropdown-item': true, 'active': option.index === activeIndex }"
              @click="onItemClick(option.index)"
              @mouseenter="setActiveIndex(option.index)"
            >
              {{ option.label }}
            </div>
          </template>
        </div>
      </transition>
    </template>

  </div>
</template>

<style lang="scss" scoped>
.select-menu {
  position: relative;
}
.select-menu-box {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  overflow: hidden;
  display: block;
  border-radius: .25rem;
  color: $textColor;
  background-color: $inputBg;
  width: 100%;
  height: 100%;
  text-align: left;
  cursor: pointer;

  &::after {
    position: absolute;
    top: .75rem;
    right: .5rem;
    width: .625rem;
    height: .4375rem;
    background-color: $textAlt;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    content: '';
    pointer-events: none;
  }

  &:active, &:focus {
    background-color: $inputBgF;
  }
}

.selected-item {
  display: block;
  height: 100%;
  width: 100%;
  padding-left: .25rem;
  background-color: transparent;
}

.placeholder {
  color: $textAlt;
}

.dropdown-menu {
  position: absolute;
  background-color: $optionTagColor;
  overflow-y: auto;
  z-index: 1000;
  border-radius: .25rem;
  padding: .25rem;
  font-size: 1rem;
  line-height: 1.75;
  @include shadow-1;
}

.dropdown-item {
  padding-left: .25rem;
}

.item-header {
  padding-left: .25rem;
  color: $textAlt;
  font-size: 1rem;
  font-weight: 400;
}

.native-item-header {
  color: $textAlt;
}

.divide {
  background-color: #5E5E5E;
  height: 1px;
  border: none;
  margin: .25rem 0;
}

.active {
  background-color: #99C8FF;
  color: #3B3B3B;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .1s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
