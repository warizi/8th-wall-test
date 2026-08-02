import {useAnimations, useGLTF} from '@react-three/drei'
import {useEffect, useMemo, useRef} from 'react'
import * as THREE from 'three'
import {SkeletonUtils} from 'three-stdlib'
import {MODELS} from './modelConfig'

/**
 * 카드(이미지 타겟) 위에 서 있는 안내 캐릭터.
 * 등장 시 Wave 1회 인사 후 종료 포즈 홀드.
 * 대화 애니메이션(animationStore)과는 분리 — 대화는 바닥의 고스트가 담당한다.
 */
export function CardCharacter() {
  const group = useRef<THREE.Group>(null)
  const {scene, animations} = useGLTF(MODELS.character.url)
  // 바닥 모드의 Character와 같은 GLTF 캐시를 쓸 수 있으므로 복제해서 사용
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const {actions} = useAnimations(animations, group)

  useEffect(() => {
    const wave = actions.Wave
    if (!wave) return
    wave.setLoop(THREE.LoopOnce, 1)
    wave.clampWhenFinished = true
    wave.play()
  }, [actions])

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  )
}
