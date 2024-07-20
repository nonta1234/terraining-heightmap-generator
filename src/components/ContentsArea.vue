<script setup lang="ts">
const mapbox = useMapbox()
const currentTab = ref(0)

const onChangeTabs = (tab: number) => {
  currentTab.value = tab
  saveSettings(mapbox.value.settings)
}
</script>


<template>
  <div id="contents-area">
    <header class="header">
      <input id="general" class="tab-input" type="radio" name="tab-switch" checked @change="onChangeTabs(0)">
      <label class="tab-switch" for="general">General</label>
      <input id="water" class="tab-input" type="radio" name="tab-switch" @change="onChangeTabs(1)">
      <label class="tab-switch" for="water">Water</label>
      <input id="modify" class="tab-input" type="radio" name="tab-switch" @change="onChangeTabs(2)">
      <label class="tab-switch" for="modify">Modify</label>
      <input id="config" class="tab-input" type="radio" name="tab-switch" @change="onChangeTabs(3)">
      <label class="tab-switch" for="config">Config</label>
    </header>
    <div class="contents">
        <GeneralTab v-if="currentTab === 0" />
        <WaterTab v-if="currentTab === 1" />
        <ModifyTab v-if="currentTab === 2" />
        <ConfigTab v-if="currentTab === 3" />
    </div>
  </div>
</template>


<style lang="scss" scoped>
#contents-area {
  width: 100%;
  padding: .625rem 0 1.5rem;
}
.header {
  display: flex;
  justify-content: space-between;
  gap: 0 calc(10% / 3 + 1px);
}
.tab-input {
  display: none;
}
.tab-input:checked + .tab-switch {
  color: $textColor;
  background-color: rgba(255, 255, 255, .25);
  border: 1px solid $borderColor2;
  &:hover {
    color: aquamarine;
  }
}
.tab-switch {
  display: block;
  height: 2em;
  line-height: 1.875;
  border-radius: 1rem;
  background-color: rgba(255, 255, 255, .05);
  border: 1px solid $borderColor;
  width: 100%;
  color: $btnColor;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  &:hover {
    color: aquamarine;
  }
  @include layout {
    line-height: 1.7143;
  }
}
.contents {
  width: 100%;
  font-size: 1rem;
  padding-top: 1rem;
  :deep(input) {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    text-overflow: clip;
    width: 100%;
    color: $textColor;
    padding: 0 .25rem;
    background-color: $inputBg;
    border-radius: .25rem;
    line-height: 2;
    flex-shrink: 0;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  :deep(input[input]) {
    color: #FFA500;
  }
  :deep(input:disabled) {
    color: $textDisabled;
    background-color: transparent;
  }
}
</style>
