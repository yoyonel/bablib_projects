// Define used GLSL version
#version 120

// le qualifieur "flat" indique au vertex processor de ne pas interpoler le paramètre (entre les 3 points définissant le triangle)
// Selon la convention spécifiée par glProvokingVertex( enum provokeMode) avec provokeMode = {FIRST_VERTEX_CONVENTION, LAST_VERTEX_CONVENTION},
// on prend (respectivement) le 1er point ou dernier point comme référence d'attribut (la couleur dans cet exemple)
flat varying vec4 object_color;

void main(void) {
	gl_Position = ftransform();
	object_color = gl_Color;
}
