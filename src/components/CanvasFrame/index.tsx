import React from "react"
import { generateCheckmate } from "../../utils/ChekmateTexture"

export default ({width = 256, height = 256, step = 64}) => {
	return React.createElement('texture', {
		attach: 'texture',
		image: generateCheckmate(width, height, step)
	})
}
