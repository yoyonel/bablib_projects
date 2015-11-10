// Uniform parameters (=global)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - Uniform Mat4 (=u_m4_*)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Object to Projective Light Space
uniform mat4 u_m4_object_to_proj_light;

// Varying parameters (=vertex to fragment shader)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - Varying Vec4 (=v_v4_*)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Texel Position in Projective Light Space
varying vec4 v_v4_texel_in_proj_light;
//varying float EyeVertexZ;

void main(void) {
	gl_Position = ftransform();

//	EyeVertexZ = -( gl_ModelViewMatrix * gl_Vertex).z;

	// Current Frame
	v_v4_texel_in_proj_light 	= u_m4_object_to_proj_light 	* gl_Vertex;
}
