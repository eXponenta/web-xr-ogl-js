import React, { useContext } from "react"
import { generateCheckmate } from "../../utils/ChekmateTexture"
import { EventContextForwarder } from "../EventContext"

export default function CanvasFrameTexture ({width = 256, height = 256, step = 64}) {
	const context = useContext(EventContextForwarder);
	const image = generateCheckmate(width, height, step);

	context.addEventListener('pointermove', e => {
		console.log('Proxed event', e);
	}, {passive: true})

	return <texture image = {image} attach = {'texture'}/>
}
