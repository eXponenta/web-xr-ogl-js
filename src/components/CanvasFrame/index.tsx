import React from "react"
import { generateCheckmate } from "../../utils/ChekmateTexture"

export default () => {
	return React.createElement('texture', {
		attach: 'texture',
		image: generateCheckmate()
	})
}
