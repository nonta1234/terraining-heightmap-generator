<script setup lang="ts">
type ListObject = {
  value: string
  label: string
}

type T = number | string | ListObject
type R = number | string

interface Props {
  id: string
  list: Array<T>
}

const model = defineModel<R>()

const props = withDefaults(defineProps<Props>(), {
  id: '',
  list: () => [] as Array<T>,
})
</script>

<template>
  <div class="select-menu">
    <span class="select-label">
      <select :id="id" v-model.number="model" class="select-input">
        <template v-if="typeof props.list[0] === 'number' || typeof props.list[0] === 'string'">
          <option v-for="item in props.list" :key="(item as R)">{{ item }}</option>
        </template>
        <template v-else>
          <option v-for="item in props.list" :key="(item as ListObject).value" :value="(item as ListObject).value">{{ (item as ListObject).label }}</option>
        </template>
      </select>
    </span>
  </div>
</template>

<style lang="scss">
.select-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  &::after {
    position: absolute;
    right: .5rem;
    width: .625rem;
    height: .4375rem;
    background-color: $textAlt;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    content: '';
    pointer-events: none;
  }
}
.select-input {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  overflow: hidden;
  display: block;
  border-radius: .25rem;
  color: $textColor;
  height: 1.875em;
  line-height: 1.875;
  background-color: $inputBg;
  font-size: 1em;
  padding-left: .25rem;
  width: 100%;
  cursor: pointer;
  &:active, &:focus {
    background-color: $inputBgF;
  }
  option {
    background: $optionTagColor;
  }
}
</style>
