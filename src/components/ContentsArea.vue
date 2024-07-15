<script setup lang="ts">




</script>


<template>
  <div id="contents-area">
    <header>
      <input id="general" type="radio" name="tab-switch" checked>
      <label class="tab-switch" for="general">General</label>
      <input id="water" type="radio" name="tab-switch">
      <label class="tab-switch" for="water">Water</label>
      <input id="modify" type="radio" name="tab-switch">
      <label class="tab-switch" for="modify">Modify</label>
      <input id="config" type="radio" name="tab-switch">
      <label class="tab-switch" for="config">Config</label>
    </header>
    <!-- <GeneralTab /> -->
    <!-- <WaterTab /> -->
    <!-- <ModifyTab /> -->
    <!-- <ConfigTab /> -->
  </div>
</template>


<style lang="scss" scoped>
#contents-area {
  padding: 1rem 0 0;
  height: 500px;
}
header {
  display: flex;
  justify-content: space-between;
}
input[name="tab-switch"] {
  display: none;
}
input:checked + .tab-switch {
  background-color: rgba(255, 255, 255, .25);
  border: 1px solid $borderColor2;
}
.tab-switch {
  display: block;
  border-radius: .25rem;
  background-color: rgba(255, 255, 255, .05);
  border: 1px solid $borderColor;
  width: 5rem;
  text-align: center;
  padding: .125rem 0;
  cursor: pointer;
}
</style>
