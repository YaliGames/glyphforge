import { ref } from 'vue'

const lockCount = ref(0)
const modalStack = ref<Symbol[]>([])

export function useScrollLock() {
  const lock = () => {
    lockCount.value++
    if (lockCount.value === 1) {
      document.body.style.overflow = 'hidden'
    }
  }

  const unlock = () => {
    lockCount.value--
    if (lockCount.value <= 0) {
      document.body.style.overflow = ''
      lockCount.value = 0
    }
  }

  return { lock, unlock }
}

export function useModalStack() {
  const id = Symbol('modal')

  const register = () => {
    modalStack.value.push(id)
  }

  const unregister = () => {
    const index = modalStack.value.indexOf(id)
    if (index > -1) {
      modalStack.value.splice(index, 1)
    }
  }

  const isTop = () => {
    return modalStack.value.length > 0 && modalStack.value[modalStack.value.length - 1] === id
  }

  return { id, register, unregister, isTop }
}
