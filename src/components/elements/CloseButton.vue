<template>
  <button class="close-button">
    <font-awesome-icon :icon="['fas', 'xmark']" class="fa-fw fa-lg" />
  </button>
</template>

<style lang="scss" scoped>
  .close-button {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
    color: $textColor;
    height: 1.5rem;
    width: 1.5rem;
    border-radius: 100%;
    text-align: center;
    background-color: rgba(255, 255, 255, .2);
    line-height: 1;
    cursor: pointer;
    @include shadow-1;
    &:hover, &:focus {
      background-color: #E03131;
      @include shadow-2;
    }
    svg {
      margin: -1px auto auto auto;
    }
  }
</style>
