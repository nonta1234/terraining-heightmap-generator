<script setup lang="ts">
const { isMobile } = useDevice()

const bottomPosition = ref('50%')
const transformState = ref('translate(-50%, 40%)')

if (isMobile) {
  bottomPosition.value = '7.5rem'
  transformState.value = 'translate(-50%, 0)'
}
</script>


<template>
  <transition name="modal" appear>
    <div class="modal">
      <slot />
    </div>
  </transition>
</template>


<style lang="scss" scoped>
  .modal {
    position: absolute;
    bottom: v-bind(bottomPosition);
    left: 50%;
    transform: v-bind(transformState);
    border-radius: .375rem;
    color: $textColor;
    font-size: 1rem;
    z-index: 10;
    padding: 0;
    overflow: hidden;
    user-select: none;
    max-width: calc(100vw - 20px);
    @include grass;
  }

  .modal-enter-from, .modal-leave-to {
    opacity: 0;
    filter: blur(0.5rem);
  }
  .modal-enter-active, .modal-leave-active {
    transition: all .25s ease;
  }
</style>
