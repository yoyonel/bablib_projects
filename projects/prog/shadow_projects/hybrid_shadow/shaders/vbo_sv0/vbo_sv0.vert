// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// MACROS
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
#define NORMALIZED_VERTEX( _vertex )	( (_vertex) / (_vertex).w )
#define PROJECT_VERTEX(_mat, _vertex)	( NORMALIZED_VERTEX( (_mat) * (_vertex) ) )
//
#define COMPUTE_LIGHTING( v3_vertex, v3_normal, v3_light_pos ) dot( normalize(v3_light_pos - v3_vertex), v3_normal );
//
#define	MIN3(a, b, c) min(min(a, b),c)
#define	MAX3(a, b, c) max(max(a, b),c)

#define EPSILON		(0.000001)		//@@ trouver l'epsilon des floats (autour de 0.)

#define GREEN		vec4( 0, 1, 0, 0 )
#define RED		vec4( 1, 0, 0, 0 )
#define BLUE		vec4( 0, 0, 1, 0 )

//#define __ONLY_RENDER_TRIANGLE_SILHOUETTE__
#define	__COMPUTE_EXTRUSION__
#define __USE_SMOOTH_STEP_ON_DIFFUSE_LIGHTING__
// -------------------------------------------------------------------------------------------------------------------------------------------------------------

uniform vec3 	u_v3_light_pos_in_object;
uniform float	u_f_seuil_iso;
uniform float	u_f_coef_extrusion;

// Vertex i courant
// gl_MultiTexCoord{0,1}: Vertex {(i+1)%2, (i+2)%2}
// gl_MultiTexCoord[2,3]: Normals{(i+1)%2, (i+2)%2}

varying float 	v_f_is_triangle_silhouette;
varying float 	v_f_coef_lighting;
varying vec4	v_v4_color;

vec3 	v3_vertex[3];
vec3 	v3_normals[3];
float 	f_coefs_lighting[3];
bool 	b_edges_are_silhouettes[2];
//
vec3 v3_light_position_in_object;
//
bool b_is_triangle_silhouette;
//

bool compute_is_triangle_silhouette_0( float f_coef0_lighting, float f_coef1_lighting, float f_coef2_lighting, float f_seuil );
bool compute_is_triangle_silhouette_1( float f_coef0_lighting, float f_coef1_lighting, float f_coef2_lighting, float f_seuil );
//
bool compute_is_edge_silhouette_0( float f_coef0_lighting, float f_coef1_lighting, float f_seuil );
bool compute_is_edge_silhouette_1( float f_coef0_lighting, float f_coef1_lighting, float f_seuil );
//
vec3 compute_extrusion();

void main(void) {
	// Light Position in Object Space
	v3_light_position_in_object 	= u_v3_light_pos_in_object;

	// On récupère les vertex du triangle rasterisé
	v3_vertex[0] 	= gl_Vertex.xyz;
        v3_vertex[1] 	= gl_MultiTexCoord0.xyz;
        v3_vertex[2] 	= gl_MultiTexCoord1.xyz;
	// On récupère les normales du triangle rasterisé
	v3_normals[0] 	= gl_Normal.xyz;
        v3_normals[1] 	= gl_MultiTexCoord2.xyz;
        v3_normals[2] 	= gl_MultiTexCoord3.xyz;

	for(int i=0; i<3; i++)
		f_coefs_lighting[i] 	= COMPUTE_LIGHTING( v3_vertex[i], v3_normals[i], u_v3_light_pos_in_object );

	#ifdef __USE_SMOOTH_STEP_ON_DIFFUSE_LIGHTING__
		for(int i=0; i<3; i++)
			f_coefs_lighting[i] 	= f_coefs_lighting[i] > 0 ? smoothstep(0.0, 1.0, f_coefs_lighting[i]) : f_coefs_lighting[i];
	#endif

	for(int i=0; i<2; i++)	
		b_edges_are_silhouettes[i] = compute_is_edge_silhouette_0( f_coefs_lighting[0], f_coefs_lighting[i+1], u_f_seuil_iso );

	b_is_triangle_silhouette = b_edges_are_silhouettes[0] || b_edges_are_silhouettes[1];
	//
	v_f_is_triangle_silhouette = float( b_is_triangle_silhouette );

	if (b_is_triangle_silhouette)
	{
		v_f_coef_lighting	= f_coefs_lighting[0];
		//
		#ifdef __USE_DEBUG_COLOR__
			v_v4_color = BLUE 	* float(b_edges_are_silhouettes[0]);
			v_v4_color += RED 	* float(b_edges_are_silhouettes[1]);
		#else
			v_v4_color = vec4(0, 1, 0, 0.1);
		#endif

		#ifdef __COMPUTE_EXTRUSION__
			v3_vertex[0] = b_is_triangle_silhouette ? compute_extrusion() : v3_vertex[0];
		#endif
	}
#ifndef __ONLY_RENDER_TRIANGLE_SILHOUETTE__
	else {
		v3_vertex[0] = vec4(0);
	}
#endif

	gl_Position = gl_ModelViewProjectionMatrix * vec4(v3_vertex[0], 1.);
}

bool compute_is_triangle_silhouette_0( float f_coef0_lighting, float f_coef1_lighting, float f_coef2_lighting, float f_seuil )
{
	float f_min_coefs_lighting = MIN3( f_coef0_lighting, f_coef1_lighting, f_coef2_lighting );
	float f_max_coefs_lighting = MAX3( f_coef0_lighting, f_coef1_lighting, f_coef2_lighting );

	return (f_min_coefs_lighting < f_seuil) && (f_max_coefs_lighting > f_seuil);
}

bool compute_is_triangle_silhouette_1( float f_coef0_lighting, float f_coef1_lighting, float f_coef2_lighting, float f_seuil )
{
	// signes des coefficients d'éclairage associés à chaque vertex du triangle
	vec3 v3_sign = sign( vec3(f_coef0_lighting, f_coef1_lighting, f_coef2_lighting) - vec3(f_seuil) );
	// on calcul la valeur absolue de la somme des signes
	float f_abs_dot = abs( v3_sign.x + v3_sign.y + v3_sign.z );
	// si tous éclairés (>0) alors la somme = 3,
	// si tous ombrés (<0) alors la |somme| = 3 (somme = -3)
	// sinon une valeur dans l'intervalle [-2, +2]
	return (f_abs_dot != 3.);
}

bool compute_is_edge_silhouette_0( float f_coef0_lighting, float f_coef1_lighting, float f_seuil )
{
	float f_ecart_iso = 0.0;

	float f_min_coefs_lighting = min( f_coef0_lighting, f_coef1_lighting );
	float f_max_coefs_lighting = max( f_coef0_lighting, f_coef1_lighting );

	float f_seuil_min = (f_seuil + (f_ecart_iso/2.));
	float f_seuil_max = (f_seuil - (f_ecart_iso/2.));

	return (f_min_coefs_lighting < f_seuil_min) && (f_max_coefs_lighting > f_seuil_max);
}

bool compute_is_edge_silhouette_1( float f_coef0_lighting, float f_coef1_lighting, float f_seuil )
{
	vec2 v2_sign = sign( vec2(f_coef0_lighting, f_coef1_lighting) - vec2(f_seuil) );
	float f_abs_dot = abs( v2_sign.x + v2_sign.y );
	return (f_abs_dot != 2.);
}


// -------------------------------------------------------------------------------------------------------------------------------------------------------------
#define GET_VERTEX(i) 					v3_vertex[i]
#define GET_WEIGHT(i) 					f_weights[i]
//
#define COMPUTE_VERTEX_EDGE_1( v0, v1, w0, w1 ) 	mix( v0, v1, w0 / (w0 + w1) )
#define COMPUTE_VERTEX_EDGE( i0, i1 ) 			COMPUTE_VERTEX_EDGE_1( GET_VERTEX(i0), GET_VERTEX(i1), GET_WEIGHT(i0), GET_WEIGHT(i1))
#define COMPUTE_VERTEX0_EDGE( i0, i1 ) 			v3_edge[0] = COMPUTE_VERTEX_EDGE( i0, i1 );
#define COMPUTE_VERTEX1_EDGE( i0, i1 ) 			v3_edge[1] = COMPUTE_VERTEX_EDGE( i0, i1 );
//
#define	COMPUTE_VERTEX0_EXTRUSION			v3_proj_edge[0] = v3_edge[0] - f_coef_extrusion*normalize(v3_light_position_in_object - v3_edge[0]);
#define	COMPUTE_VERTEX1_EXTRUSION			v3_proj_edge[1] = v3_edge[1] - f_coef_extrusion*normalize(v3_light_position_in_object - v3_edge[1]);

vec3 compute_extrusion()
{
	vec3 v3_position_vertex;

	if ( b_is_triangle_silhouette )
	{
		vec3 v3_edge[2];
		vec3 v3_proj_edge[2];
		float f_weights[3];

		float f_coef_extrusion = u_f_coef_extrusion;

		for(int i=0; i<3; i++)
		 	f_weights[i]	= abs(u_f_seuil_iso - f_coefs_lighting[i]);
//			f_weights[i]	= 0.5;

		v3_proj_edge[0] = v3_vertex[0];
			
		if ( b_edges_are_silhouettes[0] && b_edges_are_silhouettes[1])
		{
			if ( f_coefs_lighting[0] >= u_f_seuil_iso )
			{
				COMPUTE_VERTEX0_EDGE( 0, 2 );
				COMPUTE_VERTEX0_EXTRUSION;
				v3_position_vertex = v3_proj_edge[0];
			}
			else
			{
				COMPUTE_VERTEX1_EDGE( 0, 1 );
				COMPUTE_VERTEX1_EXTRUSION;
				v3_position_vertex = v3_proj_edge[1];
			}
		}
		else if ( !b_edges_are_silhouettes[0] && b_edges_are_silhouettes[1])
		{
			if ( f_coefs_lighting[2] >= u_f_seuil_iso )
			{
				COMPUTE_VERTEX0_EDGE( 2, 1 );
				v3_position_vertex = v3_edge[0];
			}
			else
			{
				COMPUTE_VERTEX1_EDGE( 2, 0 );
				v3_position_vertex = v3_edge[1];
			}
		}
		else // b_edges_are_silhouettes[0] && !b_edges_are_silhouettes[1] == TRUE
		{
			if ( f_coefs_lighting[1] >= u_f_seuil_iso )
			{
				COMPUTE_VERTEX1_EDGE( 1, 2 );
				COMPUTE_VERTEX1_EXTRUSION;
				v3_position_vertex = v3_proj_edge[1];
			}
			else
			{
				COMPUTE_VERTEX0_EDGE( 1, 0 );
				COMPUTE_VERTEX0_EXTRUSION;
				v3_position_vertex = v3_proj_edge[0];
			}
		}
	}

	return v3_position_vertex;
}

