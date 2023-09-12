import VueGtag from 'vue-gtag'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const config = useRuntimeConfig()

  nuxtApp.vueApp.use(
    VueGtag,
    {
      appName: 'Terraining - Heightmap Generator',
      pageTrackerScreenviewEnabled: true,
      config: { id: config.public.gtag },
    },
    router,
  )
})
