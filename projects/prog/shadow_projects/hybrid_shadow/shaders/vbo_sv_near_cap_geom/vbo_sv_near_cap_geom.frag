#version 120

uniform vec4 u_v4_color;

void main()
{
	gl_FragData[0] = u_v4_color;
}

