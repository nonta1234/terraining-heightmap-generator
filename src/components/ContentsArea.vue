<script setup lang="ts">
const mapbox = useMapbox()
const currentTab = ref(0)
const isShowInfo = ref(true)
const isShowDepth = ref(false)

const onChangeTabs = (tab: number) => {
  currentTab.value = tab
  isShowInfo.value = tab !== 1
  isShowDepth.value = tab === 1
  useEvent('panel:tabChange', tab)
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
      <PreviewTab v-show="currentTab !== 3" :show-info="isShowInfo">
        <GeneralCtrls v-show="currentTab === 0" />
        <WaterTab v-show="currentTab === 1" />
        <ModifyCtrls v-show="currentTab === 2" />
        <template v-if="isShowDepth" #preview-overlay>
          <div class="overlay">
            <DepthPointsCanvas />
          </div>
        </template>
      </PreviewTab>
      <ConfigTab v-show="currentTab === 3" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
#contents-area {
  width: 100%;
  padding: .625rem 0 1.25rem;
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
    background-color: rgba(0, 206, 209, .35);
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
    background-color: rgba(0, 206, 209, .1);
  }
  @include layout {
    line-height: 1.7143;
  }
}
.contents {
  width: 100%;
  font-size: 1rem;
  padding-top: 1rem;
  :deep(.input-wrapper) {
    @include common-input;
  }
  :deep(.select-menu) {
    @include common-select;
  }
}
</style>
