export interface ShadowEffect {
  readonly type: "DROP_SHADOW" | "INNER_SHADOW"
  readonly color: RGBA
  readonly offset: Vector
  readonly radius: number
  readonly spread?: number
  readonly visible: boolean
  readonly blendMode: BlendMode
}
