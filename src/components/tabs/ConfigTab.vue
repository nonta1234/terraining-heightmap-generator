<script setup lang="ts">
const mapbox = useMapbox()
const visibillity = ref(false)
const inputToken = ref<HTMLInputElement>()

const onVisibillityChange = () => {
  visibillity.value = !visibillity.value
  inputToken.value!.type = visibillity.value ? 'text' : 'password'
}
</script>


<template>
  <div id="config-tab">
    <label for="url" class="label">Mapbox User Style URL&#8202;:</label>
    <input id="url" v-model="mapbox.settings.userStyleURL" class="input" type="text" />
    <label for="token" class="label">Mapbox Access Token&#8202;:</label>
    <div class="token-input">
      <input id="token" ref="inputToken" v-model="mapbox.settings.accessToken" class="input" type="password" />
      <button class="visi-icon" @click="onVisibillityChange">
        <VisibilityOn v-if="visibillity" />
        <VisibilityOff v-else />
      </button>
    </div>
  </div>
</template>


<style lang="scss" scoped>
.label {
  display: block;
  line-height: 2;
}
.input {
  width: calc(100% - 20px - .25rem) !important;
  color: $textColor;
  padding: 0 .25rem;
  background-color: $inputBg;
  border-radius: .25rem;
  margin-bottom: .75rem;
  &:active, &:focus {
    background-color: $inputBgF;
  }
}
.token-input {
  height: 2rem;
}
.visi-icon {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  background-color: transparent;
  cursor: pointer;
  display: inline-block;
  margin-left: .25rem;
  position: relative;
  top: calc((1.75rem - 20px) / 2);
  &:hover, &:focus {
    color: aquamarine;
  }
}
</style>
