// Define used GLSL version
#version 120

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
varying vec4 v_v4_texel_in_light;
// -- Texel Position in World Space
varying vec4 v_v4_texel_in_world;
// -- Texel in Light Space
varying	vec4 v_v4_texel_in_light_space;
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - PREVIOUS FRAME (=*_prev)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Texel Position in Projective Eyes Space (previous frame)
varying vec4 v_v4_position_in_proj_eyes_prev;
// -- Texel Position in Projective Light Space (previous frame)
varying vec4 v_v4_texel_in_light_prev;

// [OBSOLETE]
//uniform mat4 u_m4_mvp;
//
//varying vec3 normal;
//varying vec4 color;
//varying vec3 lightDir;

void main(void) {
	gl_Position = ftransform();

	vec4 v4_vertex_in_world 	= u_m4_object_to_world 		* gl_Vertex;

	v_v4_texel_in_light 		= u_m4_object_to_proj_light 	* gl_Vertex;
	v_v4_texel_in_world 		= v4_vertex_in_world;
	v_v4_texel_in_light_space 	= u_m4_object_to_light 		* gl_Vertex;

	v_v4_position_in_proj_eyes_prev = u_m4_world_proj_eyes_prev 	* v4_vertex_in_world;
	v_v4_texel_in_light_prev 	= u_m4_world_to_proj_light_prev * v_v4_position_in_proj_eyes_prev;

//	color = vec4(1, 1, 1, 1);

    #define WORLD_SPACE_LIGHTING
    #ifdef WORLD_SPACE_LIGHTING
        normal = gl_Normal;
        //vec4 L = gl_ModelViewProjectionMatrixInverse * vec4(0,0,-1,0);
	vec4 L = u_v4_light_pos_in_object;
        //lightDir = L.xyz;
        lightDir = L.xyz / L.w - gl_Vertex.xyz / gl_Vertex.w;
    #else
        normal = gl_NormalMatrix * gl_Normal;
        lightDir = vec3(0,0,1);
    #endif
}
