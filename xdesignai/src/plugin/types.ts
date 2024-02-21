// Describes a Figma user e.g. the current user
export type FigmaUser = {
  id: string;
  photoURL: string;
  name: string;
};

// Describes the NODE_ENV environment
export type Environment = 'development' | 'production';

// Higher order generic for describing transactional return values
export type Transaction<Value> = [Value, true] | [null, false];

// Describes a prompt configuration
export type PromptConfiguration = {
  temperature: number;
  threshold: number;
  timeout: number;
};

// Describes a canvas orign
export type Origin = {
  x: number;
  y: number;
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export type VariableValue<T> = {
  type: 'VARIABLE';
  id: string; // E.g. "foo-bar-baz-123"
  fallback: T;
};

export type ConstantValue<T> = {
  type: 'CONSTANT';
  value: T;
};

// Convenience function to check whether a value is a constant
export function isValueConstant<T>(value: T | ConstantValue<T> | VariableValue<T>): value is ConstantValue<T> {
  const ok =
    typeof value === 'object' && // Check object
    value !== null && // Check object is non-null
    'type' in value && // Check object has "type"
    value.type === 'CONSTANT'; // Check object type is "CONSTANT"
  return ok;
}

// Convenience function to check whether a value is a variable
export function isValueVariable<T>(value: T | ConstantValue<T> | VariableValue<T>): value is VariableValue<T> {
  const ok =
    typeof value === 'object' && // Check object
    value !== null && // Check object is non-null
    'type' in value && // Check object has "type"
    value.type === 'VARIABLE'; // Check object type is "VARIABLE"
  return ok;
}

export type InspectedValue<T> =
  | { type: 'VALUE'; value: T }
  | { type: 'CONSTANT'; value: ConstantValue<T> }
  | { type: 'VARIABLE'; value: VariableValue<T> };

// Must use if-else statements here because TypeScript type narrowing doesn't
// work on switch (true) statements
export function inspectValue<T>(value: T | ConstantValue<T> | VariableValue<T>): InspectedValue<T> {
  if (isValueConstant(value)) {
    return { type: 'CONSTANT', value };
  } else if (isValueVariable(value)) {
    return { type: 'VARIABLE', value };
  } else {
    return { type: 'VALUE', value };
  }
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export type WorldviewSolidPaint = {
  type: 'SOLID'; // TODO: Opportunity to add other paint types
  color: RGBA;
};

export type WorldviewDropShadowEffect = {
  type: 'DROP_SHADOW';
  color: RGBA;
  offset: Vector;
  radius: number;
  spread?: number; // Why is this undefinable??
};

export type WorldviewInnerShadowEffect = {
  type: 'INNER_SHADOW';
  color: RGBA;
  offset: Vector;
  radius: number;
  spread?: number; // Why is this undefinable??
};

export type WorldviewImagePaint = {
  type: 'IMAGE';
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageHash: string;
};

export type WorldviewGradientPaint = {
  type: 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  gradientStops: ColorStop[];
  gradientTransform: Transform;
};

export type WorldviewPaint = WorldviewSolidPaint | WorldviewImagePaint | WorldviewGradientPaint;

export type WorldviewEffect = WorldviewDropShadowEffect | WorldviewInnerShadowEffect;

export type WorldviewEffectType = WorldviewEffect['type'];

export type WorldviewVectorVertex = {
  x: number;
  y: number;
  strokeCap?: string; // 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL'
  strokeJoin?: string; // 'MITER' | 'BEVEL' | 'ROUND'
  cornerRadius?: number;
  handleMirroring?: string; // 'NONE' | 'ANGLE' | 'ANGLE_AND_LENGTH'
};

export type WorldviewVectorSegment = {
  start: number;
  end: number;
  tangentStart?: Vector;
  tangentEnd?: Vector;
};

export type WorldviewVectorRegion = {
  windingRule: WindingRule;
  loops: Array<Array<number>>;
  fills?: Array<Paint>;
  fillStyleId?: string;
};

export type WorldviewVectorNetwork = {
  vertices: Array<WorldviewVectorVertex>;
  segments: Array<VectorSegment>;
  regions?: Array<WorldviewVectorRegion>;
};

export type WorldviewVectorPath = {
  windingRule: WindingRule | 'None';
  data: string;
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export type WorldviewContainerNode = {
  type: 'CONTAINER';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Layout
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';
  itemSpacing?: number;

  // Fill
  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Stroke
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeTopWeight?: number;
  strokeBottomWeight?: number;
  strokeLeftWeight?: number;
  strokeRightWeight?: number;

  // Corner radius
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;

  // Effects
  effects?: WorldviewEffect[];

  //ProtoType
  reaction?: Reaction[];

  // Children
  children: WorldviewNode[] | null;
};

export type WorldviewInstanceNode = {
  type: 'INSTANCE';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';
  itemSpacing?: number;

  // Padding
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;

  // Fill
  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Stroke
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeTopWeight?: number;
  strokeBottomWeight?: number;
  strokeLeftWeight?: number;
  strokeRightWeight?: number;

  // Corner radius
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;

  // Effects
  effects?: WorldviewEffect[];

  //ProtoType
  reaction?: Reaction[];

  // Children
  children: WorldviewNode[] | null;
};

export type WorldviewGroupNode = {
  type: 'GROUP';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Effects
  effects?: WorldviewEffect[];

  //ProtoType
  reaction?: Reaction[];

  // Children
  children: WorldviewNode[] | null;
};

// TODO: Missing auto layout ...
export type WorldviewVoidContainerNode = {
  type: 'VOID_CONTAINER';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Fill
  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Stroke
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeTopWeight?: number;
  strokeBottomWeight?: number;
  strokeLeftWeight?: number;
  strokeRightWeight?: number;

  // Corner radius
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;

  // Effects
  effects?: WorldviewEffect[];

  //ProtoType
  reaction?: Reaction[];
};

export type WorldviewEllipseNode = {
  type: 'ELLIPSE';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Stroke
  // NOTE: This is intended to be recurisve
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeWeight?: number;

  //ProtoType
  reaction?: Reaction[];
};

export type WorldviewLineNode = {
  type: 'LINE';
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Effects
  effects?: WorldviewEffect[];
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeWeight?: number;

  //ProtoType
  reaction?: Reaction[];
};

export type WorldviewBooleanOperationNode = {
  type: 'BOOLEAN_OPERATION';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Effects
  effects?: WorldviewEffect[];

  //ProtoType
  reaction?: Reaction[];

  // Children
  children: WorldviewNode[] | null;
  booleanOperation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
};

export type WorldviewIconContainerNode = {
  type: 'ICON_CONTAINER';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Fill
  // NOTE: This is intended to be recurisve
  fill?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;

  // Stroke
  // NOTE: This is intended to be recurisve
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeWeight?: number;

  // SVG
  data: string | VariableValue<string> | ConstantValue<string>;

  //ProtoType
  reaction?: Reaction[];
};

export type WorldviewStarNode = {
  type: 'STAR';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  cornerRadius: number;
  count: number;
  ratio: number;
  cornerSmoothing: number;
  constrainProportions: boolean;
  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Stroke
  // NOTE: This is intended to be recurisve
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeWeight?: number;

  //ProtoType
  reaction?: Reaction[];
};

export type WorldviewPolygonNode = {
  type: 'POLYGON';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  cornerRadius: number;
  count: number;
  cornerSmoothing: number;
  constrainProportions: boolean;
  fill?: WorldviewPaint | VariableValue<WorldviewPaint> | ConstantValue<WorldviewPaint>;

  // Stroke
  // NOTE: This is intended to be recurisve
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeWeight?: number;

  //ProtoType
  reaction?: Reaction[];
};

// TODO: Add textNode.textAutoResize?
// TODO: Add textNode.textDecoration?
export type WorldviewTextNode = {
  type: 'TEXT';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Fill
  fill?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;

  // Typography
  fontName: FontName; // Sorted
  fontSize: number;
  fontWeight: number;
  letterSpacing: LetterSpacing;
  lineHeight: LineHeight;
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  textCase: 'ORIGINAL' | 'UPPER' | 'LOWER';

  // Characters
  characters: string | VariableValue<string> | ConstantValue<string>;
  // Truncation
  truncation: 'DISABLED' | 'ENDING';

  //ProtoType
  reaction?: Reaction[];
};

export type WorldviewVectorNode = {
  type: 'VECTOR';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Fill
  // NOTE: This is intended to be recurisve
  fill?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;

  // Stroke
  // NOTE: This is intended to be recurisve
  stroke?: WorldviewSolidPaint | VariableValue<WorldviewSolidPaint> | ConstantValue<WorldviewSolidPaint>;
  strokeWeight?: number;

  vectorNetwork: VectorNetwork; // WorldviewVectorNetwork
  vectorPaths: VectorPaths; // Array<WorldviewVectorPath>

  //ProtoType
  reaction?: Reaction[];
};

export type WorldviewNode =
  | WorldviewContainerNode
  | WorldviewInstanceNode
  | WorldviewVoidContainerNode
  | WorldviewIconContainerNode
  | WorldviewTextNode
  | WorldviewVectorNode
  | WorldviewGroupNode
  | WorldviewEllipseNode
  | WorldviewBooleanOperationNode
  | WorldviewLineNode
  | WorldviewStarNode
  | WorldviewPolygonNode;
export type WorldviewNodeType = WorldviewNode['type'];

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// Represents a binary asset before processing
type PreprocessedBinaryAsset = {
  type: 'PREPROCESSED';
  value: WorldviewImagePaint;
};

// Represents a binary asset after processing
type PostprocessedBinaryAsset = {
  type: 'POSTPROCESSED';
  value: {
    url: string;
    description: string;
  };
};

export type EmanationSDKTheme = {
  colors: {
    [key: string]: WorldviewSolidPaint; // TODO?
  };
  images: {
    [key: string]: PreprocessedBinaryAsset | PostprocessedBinaryAsset;
  };
  icons: {
    [key: string]: string;
  };
  characters: {
    [key: string]: string;
  };
  gradients: {
    [key: string]: WorldviewGradientPaint;
  };
};

export type EmanationSDKScreen = {
  meta: {
    theme: EmanationSDKTheme;
  };
  name: string; // E.g. "Profile"
  description: string; // E.g. "The profile screen"
  root: WorldviewNode;
};

export type EmanationSDKApp = {
  meta: {};

  name: string; // E.g. "Finance app"
  description: string; // E.g. "A personal finance app"
  screens: EmanationSDKScreen[];
};

export type EmanationSDKEpoch = {
  name: string; // E.g. "" + Date.now()
  apps: EmanationSDKApp[];
};

export type EmanationSDKAssets = {
  [key: string]: number[] | string;
};
