#define GREEN		vec4( 0, 1, 0, 0 )
#define RED		vec4( 1, 0, 0, 0 )
#define BLUE		vec4( 0, 0, 1, 0 )
//
#define EPSILON		(0.000001)		//@@ trouver l'epsilon des floats (autour de 0.)

#define USE_AMBIENT_LIGHTING
float f_coef_ambient_lighting = 0.15;

//#define __DEBUG_EDGE__

uniform float 	u_f_seuil_iso;

varying float 	v_f_is_triangle_silhouette;
varying float	v_f_coef_lighting;
varying vec4	v_v4_color;

float f_ecart_iso = 0.0125;

void compute_edge( in float f_coef_lighting, out bool b_is_edge, out float f_coef_edge );
vec4 debug_edge();

void main()
{
	vec4 out_color = v_v4_color;

	#ifdef __DEBUG_EDGE__
		out_color = debug_edge();
	#endif
	
	out_color.w = v_v4_color.w;

	gl_FragData[0] = out_color;
}

vec4 debug_edge()
{
	vec4 out_color;

	// Lighting Gouraud
	float f_coef_lighting = v_f_coef_lighting;

	// Si une arête de silhouette passe par un triangle, tous ces sommets sont actifs
	vec4 v4_color = ( v_f_is_triangle_silhouette >= (1. - EPSILON) ) ? //(2./3.) ) ? 
			v_v4_color*0.6 : //RED*0.6 : 
			(BLUE*0.4 + GREEN*0.2);

	#ifdef USE_AMBIENT_LIGHTING
		out_color = v4_color * (v_f_is_triangle_silhouette > 0.5 ? 1. : min(1., max(0., f_coef_lighting) + f_coef_ambient_lighting));
	#else
		out_color = v4_color * (v_f_is_triangle_silhouette > 0.5 ? 1. : f_coef_ambient_lighting);
	#endif

	// Silhouette de silhouette analogique (iso courbe du champs de potentiel de la lumière sur le mesh)
	bool b_is_edge;
	float f_coef_edge;
	compute_edge ( f_coef_lighting, b_is_edge, f_coef_edge );

	out_color = b_is_edge ? (GREEN + RED) * f_coef_edge : out_color;

	return out_color;
}

void compute_edge( 	in float f_coef_lighting, 
			out bool b_is_edge, out float f_coef_edge )
{
	//
	float f_max_seuil = u_f_seuil_iso + f_ecart_iso / 2.;
	float f_min_seuil = f_max_seuil - f_ecart_iso;

	b_is_edge = (f_coef_lighting <= f_max_seuil) && (f_coef_lighting >= f_min_seuil);

	f_coef_edge = f_coef_lighting;

	if (b_is_edge)
	{
		float f_smooth_edge = smoothstep(f_min_seuil, f_max_seuil, f_coef_lighting);
		f_coef_edge = 1. - abs( 2. * ( 0.5 - f_smooth_edge ) ); // [0,1] -> [0, 1]<->[1, 0]
	}
}
