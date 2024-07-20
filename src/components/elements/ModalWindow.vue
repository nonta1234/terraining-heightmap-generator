<script setup lang="ts">
interface Props {
  modal: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modal: false,
})

const { isMobile } = useDevice()
const bottomPosition = ref('50%')
const transformState = ref('translate(-50%, 45%)')

if (isMobile) {
  bottomPosition.value = '7.5rem'
  transformState.value = 'translate(-50%, 0)'
}
</script>


<template>
  <transition name="modal">
    <div v-if="props.modal" class="modal-wrapper">
      <div class="panel opaque">
        <slot />
      </div>
    </div>
    <div v-else :class="['panel', isMobile ? 'opaque' : 'grass']">
      <slot />
    </div>
  </transition>
</template>


<style lang="scss" scoped>
  .panel {
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
  }
  .grass {
    @include grass;
  }
  .opaque {
    @include opaque;
  }
  .modal-wrapper {
    position: absolute;
    height: 100dvh;
    width: 100%;
    // background-color: rgba(0, 0, 0, .4);
    background: transparent;
    -webkit-backdrop-filter: blur(2px) saturate(50%) brightness(60%);
    backdrop-filter: blur(2px) saturate(50%) brightness(60%);
    z-index: 20;
  }
  .modal-enter-from, .modal-leave-to {
    opacity: 0;
    filter: blur(0.5rem);
  }
  .modal-enter-active, .modal-leave-active {
    transition: all .25s ease;
  }
</style>
