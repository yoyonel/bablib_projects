// Define used GLSL version
#version 120

uniform sampler2D texture;

void main(void) {	
	vec4 texSample = texture2D(texture, gl_TexCoord[0].xy);
	
	//gl_FragColor= vec4(texSample.x != 1, texSample.yz, 1);
	//gl_FragColor= vec4(1);
	gl_FragColor= texSample;
}

