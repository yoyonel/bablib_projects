// Define used GLSL version
//#version 120

// Uniform parameters (=global)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - Uniform Mat4 (=u_m4_*)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Object to Light Space
uniform	mat4 u_m4_object_to_light;
// -- Object to Projective Light Space
uniform mat4 u_m4_object_to_proj_light;
// -- Object to World Space
uniform mat4 u_m4_object_to_world;
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - PREVIOUS FRAME (=*_prev)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- World to Projective Eyes Space
uniform mat4 u_m4_world_proj_eyes_prev;
// -- World to Projective Light Space
uniform mat4 u_m4_world_to_proj_light_prev;
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - Uniform Vec4 (=u_v4)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Light Position in Object Space
uniform vec4 u_v4_light_pos_in_object;

// Varying parameters (=vertex to fragment shader)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - Varying Vec4 (=v_v4_*)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Texel Position in Projective Light Space
varying vec4 v_v4_texel_in_proj_light;
// -- Texel Position in World Space
varying vec4 v_v4_texel_in_world;
// -- Texel in Light Space
varying	vec4 v_v4_texel_in_light;
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - PREVIOUS FRAME (=*_prev)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Texel Position in Projective Eyes Space (previous frame)
varying vec4 v_v4_texel_in_eyes_proj_prev;
// -- Texel Position in Projective Light Space (previous frame)
varying vec4 v_v4_texel_in_light_proj_prev;
//
varying vec3 v_v3_normal;
varying vec3 v_v3_normal_in_object;
varying vec3 v_v3_lightDir_in_object;

void main(void) {
	gl_Position = ftransform();

	v_v3_normal = gl_NormalMatrix * gl_Normal;

	vec4 v4_vertex_in_world 	= u_m4_object_to_world 		* gl_Vertex;

	// Current Frame
	v_v4_texel_in_proj_light 	= u_m4_object_to_proj_light 	* gl_Vertex;
	v_v4_texel_in_light 		= u_m4_object_to_light 		* gl_Vertex;
	v_v4_texel_in_world 		= v4_vertex_in_world;

	// Previous Frame
	v_v4_texel_in_eyes_proj_prev 	= u_m4_world_proj_eyes_prev 	* v4_vertex_in_world;
	v_v4_texel_in_light_proj_prev 	= u_m4_world_to_proj_light_prev * v_v4_texel_in_eyes_proj_prev;

    #define WORLD_SPACE_LIGHTING
    #ifdef WORLD_SPACE_LIGHTING
        v_v3_normal_in_object = gl_Normal;
	vec4 L = u_v4_light_pos_in_object;
        v_v3_lightDir_in_object = L.xyz / L.w - gl_Vertex.xyz / gl_Vertex.w;
    #else
        normal = gl_NormalMatrix * gl_Normal;
        lightDir = vec3(0,0,1);
    #endif

}
