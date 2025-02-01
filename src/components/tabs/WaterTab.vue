<script setup lang="ts">
const mapbox = useMapbox()

const onLittoralSlopeToggle = () => {
  nextTick()
  useEvent('panel:updateHeight')
}
</script>

<template>
  <div id="water-tab">
    <details @toggle="onLittoralSlopeToggle">
      <summary>Littoral Slope</summary>
      <GridCanvas />
      <ResetSlope class="reset-slope" />
    </details>
    <hr>
    <div class="controls">
      <label for="waterside">Detail&#8202;:</label>
      <SelectMenu id="waterside" v-model="mapbox.settings.waterside" class="gap"
        :options="[
          { value: 2, label: 'High' },
          { value: 1, label: 'Mid' },
          { value: 0, label: 'Low' },
        ]"
      />
      <label for="water-depth">Water Depth&#8202;:</label>
      <NumberInput id="water-depth" v-model="mapbox.settings.depth" :max="200" :min="0" :step="1" unit="m" />
      <label for="litt-zone">Littoral Zone&#8202;:</label>
      <NumberInput id="litt-zone" v-model="mapbox.settings.littoral" class="gap" :max="500" :min="0" :step="1" unit="m" />
      <label for="ripa-zone">Riparian Zone&#8202;:</label>
      <NumberInput id="ripa-zone" v-model="mapbox.settings.riparian" :max="100" :min="0" :step="1" unit="m" />
      <label for="stream-depth">Stream Depth&#8202;:</label>
      <NumberInput id="stream-depth" v-model="mapbox.settings.streamDepth" class="gap" :max="100" :min="0" :step="1" unit="m" />
      <label for="stream-width">Stream Width&#8202;:</label>
      <NumberInput id="stream-width" v-model="mapbox.settings.streamWidth" :max="15" :min="1" :step="1" unit="m" />
      <label for="actual-seafloor" class="as">Use actual seafloor&#8202;:</label>
      <ToggleSwitch v-model="mapbox.settings.actualSeafloor" :name="'actual-seafloor'" class="as-switch" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
#water-tab {
  width: 100%;
}

details {
  margin: .5rem 0 .75rem;
}

summary {
  margin-bottom: .125rem;
  cursor: pointer;
  outline: none;
  &:focus, &:hover {
    color: aquamarine;
  }
}

.reset-slope {
  margin-top: .5rem;
}

.controls {
  display: grid;
  width: 100%;
  gap: .75rem 0;
  margin: .75rem 0 1rem;
  grid-template-columns: 7rem 6.5em 7rem 5.5rem;
  line-height: 1.875;

  @media screen and (max-width: 524px) {
    grid-template-columns: 1fr 7rem;
  }
}

.as-switch {
  margin: auto 1rem auto auto !important;

  @media screen and (max-width: 524px) {
    margin: auto 0 auto auto !important;
  }
}

hr {
  background-color: $borderColor;
  height: 2px;
  border: none;
  grid-column: 1 / 5;

  @media screen and (max-width: 524px) {
    grid-column: 1 / 3;
  }
}

@media screen and (min-width: 525px) {
  .gap {
    width: 5.5rem !important;
  }

  .as {
    grid-column: 1 / 3;
    grid-row: 4 / 5;
    z-index: 5;
  }

  .as-switch {
    grid-column: 2 / 3;
    grid-row: 4 / 5;
    z-index: 10;
  }
}
</style>
