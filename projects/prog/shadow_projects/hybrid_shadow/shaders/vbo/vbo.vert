// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// MACROS
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
#define NORMALIZED_VERTEX( _vertex )	( (_vertex) / (_vertex).w )
#define PROJECT_VERTEX(_mat, _vertex)	( NORMALIZED_VERTEX( (_mat) * (_vertex) ) )
//
#define COMPUTE_LIGHTING( v3_vertex, v3_normal, v3_light_pos ) dot( normalize(v3_light_pos - v3_vertex), v3_normal );

#define GREEN		vec4( 0, 1, 0, 0 )
#define RED		vec4( 1, 0, 0, 0 )
#define BLUE		vec4( 0, 0, 1, 0 )
//
#define EPSILON		(0.000001)		//@@ trouver l'epsilon des floats (autour de 0.)

// -------------------------------------------------------------------------------------------------------------------------------------------------------------

uniform vec3 	u_v3_light_pos_in_object;

varying vec4	v_v4_color;
varying	vec3	v_v3_position;
varying	vec3	v_v3_normal;
varying float	v_f_diffuse_lighting;

void main(void) {
	gl_Position = ftransform();

	v_v4_color = gl_Color;

	v_v3_position 	= gl_Vertex;
	v_v3_normal	= gl_Normal;

        v_f_diffuse_lighting = COMPUTE_LIGHTING( gl_Vertex, gl_Normal, u_v3_light_pos_in_object );
}


