import { forwardRef } from 'react';
import { extend, Node } from 'react-ogl';
import { selectProps } from '../../utils/selectProps';
import { OGLQuadLayer } from '../../xr/OGLXRLayer';

extend({
	XrQuadLayer : OGLQuadLayer
});

export type XRQuadLayerProps = Node<OGLQuadLayer, typeof OGLQuadLayer>;

declare global {
   namespace JSX {
	   interface IntrinsicElements {
		   xrQuadLayer: XRQuadLayerProps;
	   }
   }
}

const KnownProps: Array<string> = ['width', 'height', 'viewPixelWidth', 'viewPixelHeight'];

export const XRQuadLayer = forwardRef((props: XRQuadLayerProps, ref) => <xrQuadLayer {...props} ref = {ref} />)
