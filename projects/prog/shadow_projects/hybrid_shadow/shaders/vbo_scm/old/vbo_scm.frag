#extension GL_EXT_gpu_shader4 : enable

// Define used GLSL version
//#version 120

#define DEPTH_BIAS	(-0.015 * 4.)

#define GREEN	vec4( 0, 1, 0, 0 )
#define RED	vec4( 1, 0, 0, 0 )
#define BLUE	vec4( 0, 0, 1, 0 )

#define EPSILON		(0.000001)		//@@ trouver l'epsilon des floats (autour de 0.)


#define IN_PENUMBRA(_coef_shadow, _seuil) 	( ( (_coef_shadow) >= (_seuil) ) && ( (_coef_shadow) <= (1.0 - _seuil) ) )
#define IN_HARDSHADOW(_shadow, _seuil) 		( ( ( (_shadow) < (_seuil) ) ) ) 

//#define USE_SHADOW_PROJ
#define USE_SHADOW_PCF		0
#define USE_SHADOW_BICUBIC	1

#define SHADOW_TECHNIQUE	USE_SHADOW_PCF
//#define SHADOW_TECHNIQUE	USE_SHADOW_BICUBIC

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// DRAW DEBUG
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
//#define DRAW_GRID
//#define DRAW_CONFIDENCE
//#define DRAW_FILTER_COLOR
//#define DRAW_NEW_TEXEL
// -------------------------------------------------------------------------------------------------------------------------------------------------------------

#define USE_TEMPORAL_CONFIDENCE

//#define CLAMP_COEF_SHADOW
float 	clamp_coef_shadow_seuil 	= 0.09;

float	new_texel_distance_seuil	= 0.001; 	// si valeur trop grande, les pixels de bord prennent le dessus

#define	USE_DYNAMIC_COEF_POWER_FUNCTION
float 	init_coef_power_function	= 1.0;
float	step_coef_power_function	= 0.1;
float	max_coef_power_function		= 15.0;
float	coef_power_function		= init_coef_power_function;

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// COEF CONFIDENCE
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
//#define CLAMP_COEF_CONFIDENCE
float	clamp_confidence_seuil 		= 0.85;

//#define USE_RADIUS_CONFIDENCE
float 	radius_conf 	= 1.0;

//#define REMAP_COEF_CONFIDENCE
float 	coef_conf_min = 0.6;
// -------------------------------------------------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// EXPERIMENTAL(s) STUFF(s)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
//#define USE_EXPERIMENTAL_CORRECTION_FOR_MOVEMENT_DIFF_VIS
float	coef_diff_for_new_texel	= 0.8;

//#define USE_EXPERIMENTAL_CORRECTION_FOR_MOVEMENT_DIFF_POS_OCC
float 	coef_diff_pows = 0.001;

// relié directement avec [draw_scene_with_scm.frag]
//#define USE_EXPERIMENTAL_SUBPIXEL_SHADOWED
// -------------------------------------------------------------------------------------------------------------------------------------------------------------

// - SAMPLERs
uniform sampler2DShadow	shadowMap;
//uniform sampler2D	shadowContour;
//uniform sampler2D	tex_depth;

// - les textures tex_history_* pointent sur les résultats précédents
uniform sampler2D	tex_history_visibility, 
			tex_history_positions,
			tex_history_positions_occluders;
// -
uniform sampler2D	tex_sm_triangle_vertex0, tex_sm_triangle_vertex1, tex_sm_triangle_vertex2;
uniform sampler2D	tex_sm_pows;

// - TAILLES DES TEXTURES
uniform vec2 	v2_sm_size;
// - BIAS SHADOW MAP (uniform)
uniform float 	coef_depth_bias;

// Current vertex varying attributes for fragment shader
varying vec4 v_v4_texel_in_light;
varying vec4 v_v4_texel_in_world;
varying	vec4 v_v4_texel_in_light_space;
//
varying vec4 v_v4_position_in_proj_eyes_prev;
varying vec4 v_v4_texel_in_light_prev;
//
//varying vec3 normal;
//varying vec4 color;
//varying vec3 lightDir;

uniform	mat4	u_m4_world_light;	// Uniform Matrix World to LightSpace
uniform	mat4	u_m4_light_proj;	// Uniform Matrix LightSpace to ProjectiveLightSpace
	
// - Prototypes - Fonctions
vec4 	interpolate_bicubic_fast(sampler2D tex, vec2 _texCoord, vec2 _sizeTexture);
vec4 	interpolate_bicubic_fast(sampler2DShadow tex_depth_map, vec3 _texCoord, vec2 _sizeTexture);
//
float 	Compute_Grid( vec2 texel_in_texture_light_space, vec2 _sizeTexture );
vec4	filterColor( in float coef_shadow );
float 	Compute_Confidence( vec4 texel_in_texture_light_space, vec2 _sizeTexture );
void	compute_subpixel( 
		in vec4 texel_in_texture_light_space, in vec4 texel_in_projective_light_space, in vec2 _sizeTexture, in vec4 v_v4_texel_in_light_space,
		out bool subpixel_proj_in_triangle, out bool pixel_is_shadowed_by_plane
	);

//
bool 	Point_In_Triangle_2D( vec2 A, vec2 B, vec2 C, vec2 P);

void main(void) {

	vec4 texel_in_texture_light_space;
	vec4 texel_in_projective_light_space;

	#ifdef USE_SHADOW_PROJ
		texel_in_texture_light_space = v_v4_texel_in_light;
		// Bias Uniform (non normalisé)
		texel_in_texture_light_space.z	+= coef_depth_bias * v_v4_texel_in_light.w;
	#else
		// Normalisation manuelle (TODO: voir shadow2DProj)
		texel_in_projective_light_space = v_v4_texel_in_light / v_v4_texel_in_light.w;

		// Bias Uniform (TODO: voir Gradient Shadow Map)
		texel_in_projective_light_space.z += coef_depth_bias;

		// Light_Space to Texture_Space(_light)
		texel_in_texture_light_space = (texel_in_projective_light_space + vec4(1.) ) * vec4(0.5);
	#endif
	
	float shadow;
	#if (SHADOW_TECHNIQUE == USE_SHADOW_PCF)
		// Depth Test (ShadowMap)
		// - with PCF 2x2 if filter_mode = GL_LINEAR, work on ATI)
		// - NEAREST mode if filter_mode = GL_NEAREST	
		float shadow_PCF;
		#ifdef USE_SHADOW_PROJ
			shadow_PCF = shadow2DProj( shadowMap, texel_in_texture_light_space ).r;	
		#else
	 		shadow_PCF = shadow2D( shadowMap, vec3(texel_in_texture_light_space) ).r;	
	 	#endif
		shadow = shadow_PCF;
	#elif (SHADOW_TECHNIQUE == USE_SHADOW_BICUBIC)
		float shadow_BiCubic = interpolate_bicubic_fast( shadowMap, vec3(texel_in_texture_light_space), v2_sm_size ).x;
		shadow = shadow_BiCubic;
	#endif

 	/*	
	//
	//shadow =  shadow_BiCubic;
	// -
	//shadow = shadow_Contour;
	//shadow = abs( shadow_PCF - shadow_BiCubic );
	//shadow = shadow_BiCubic < 0.9999 ? shadow_Contour : shadow_PCF;
	//shadow = abs( shadow_Contour - shadow_BiCubic );
	//shadow = smoothstep( shadow, -0.01, 0.1 );
	*/
		
	vec4 out_color;
	out_color = vec4( shadow );
	
//	#ifdef CLAMP_COEF_SHADOW
//		out_color = shadow >= clamp_coef_shadow_seuil ? vec4(1.) : vec4(0.);
//	#endif
	
//#ifdef USE_TEMPORAL_CONFIDENCE
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------
	vec4 	v_v4_position_in_proj_eyes_prev_normalized 	= v_v4_position_in_proj_eyes_prev / v_v4_position_in_proj_eyes_prev.w;
		v_v4_position_in_proj_eyes_prev_normalized 	= (v_v4_position_in_proj_eyes_prev_normalized + vec4(1.)) * vec4(0.5); // [-1, +1] -> [0.0, 1.0] (Screen Space -> Texture Space)
	// - Position Receiver
	vec4	texel_pos_prev 	= texture2D( tex_history_positions, 			v_v4_position_in_proj_eyes_prev_normalized.xy );	// previous position 		in WorldSpace
	// - Visibility Receiver
	vec4	texel_vis_prev	= texture2D( tex_history_visibility, 			v_v4_position_in_proj_eyes_prev_normalized.xy );	// previous visibility 		in WorldSpace

	// - Positions Occluders (frame courante, et précédente)
	vec4	texel_pows_prev	= texture2D( tex_history_positions_occluders, 		v_v4_position_in_proj_eyes_prev_normalized.xy );	// previous position occluder 	in WorldSpace
	vec4	texel_pows	= texture2D( tex_sm_pows,				texel_in_texture_light_space.xy );	// actual   position occluder 	in WorldSpace	

	vec4 	v_v4_texel_in_world_Normalized = v_v4_texel_in_world / v_v4_texel_in_world.w;
	//
	vec3 	v_diff 		= texel_pos_prev.xyz - v_v4_texel_in_world_Normalized.xyz;
	float 	distance_2 	= dot(v_diff, v_diff);
	//
	vec2 	v_diff_rec_occ 	= texel_pows - v_v4_texel_in_world_Normalized;
	float 	dist2_ro 	= dot(v_diff_rec_occ, v_diff_rec_occ);
	//
	bool	new_receiver 	= (distance_2 >= new_texel_distance_seuil);
	#ifdef USE_EXPERIMENTAL_CORRECTION_FOR_MOVEMENT_DIFF_VIS
		float 	variance_visibility	= abs(shadow - texel_vis_prev.x);
		bool 	variance		= variance_visibility >= (coef_diff_for_new_texel - EPSILON);
			new_receiver 		= IN_PENUMBRA(texel_vis_prev.x, EPSILON) && IN_PENUMBRA(shadow, EPSILON) ? new_receiver : new_receiver || variance;
	#endif
	bool 	new_texel	= new_receiver || (v_v4_position_in_proj_eyes_prev_normalized.x<0 || v_v4_position_in_proj_eyes_prev_normalized.x>+1 || v_v4_position_in_proj_eyes_prev_normalized.y<0 || v_v4_position_in_proj_eyes_prev_normalized.y>+1);
	bool	self_shadow	= dist2_ro <= (0.1*0.1);

#ifdef USE_TEMPORAL_CONFIDENCE
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------		 
	//- Update History Buffers
	// -- Positions Receiver
	gl_FragData[1] = v_v4_texel_in_world_Normalized; 	// update history position
	// -- Positions Casters (Occluders)
	gl_FragData[2] = texel_pows;
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------
	float 	confidence_sm = 0.0;
	float	tsm = 0.0;
	bool 	subpixel_shadowed = false;
	float	weight = 0.0;
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------

	// -------------------------------------------------------------------------------------------------------------------------------------------------------------
	if (new_texel) {
		tsm = shadow;
		subpixel_shadowed = false;
	}
	else {
		#ifdef USE_DYNAMIC_COEF_POWER_FUNCTION
			coef_power_function = texel_vis_prev.z + step_coef_power_function;
			coef_power_function = min( max_coef_power_function, coef_power_function );
		#endif

//		subpixel_shadowed = 
//			IN_HARDSHADOW(shadow, EPSILON) && 
//			compute_subpixel( texel_in_texture_light_space, texel_in_projective_light_space, v2_sm_size );

		// ---- Calcul de la confidence
		if (subpixel_shadowed) 
		{
			confidence_sm = +1.0;
		}
		else
		{
			confidence_sm = Compute_Confidence( texel_in_texture_light_space, v2_sm_size ); 
		}
		// ---- Calcul du poids
		weight = pow( confidence_sm, coef_power_function );
		// ---- Mix temporel de la visibilité
		tsm = mix( texel_vis_prev.x, shadow, weight );
	}
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------		 
	// - Update History Buffers
	out_color = vec4(
			tsm, 
			distance_2, 			 
			coef_power_function, //dist2_ro,
			subpixel_shadowed ? 1. : 0.0
			);
#endif

//	bool subtexel_shadowed;
//	subtexel_shadowed = compute_subpixel( texel_in_texture_light_space, texel_in_projective_light_space, v2_sm_size);
////	if (IN_PENUMBRA(shadow, 0.0)) {
////		// ombré ou dans la pénombre
////		subtexel_shadowed = compute_subpixel( texel_in_texture_light_space, texel_in_projective_light_space, v2_sm_size);
////	}	
////	else {
////		subtexel_shadowed = false;		
////	}
//	//confidence_sm = shadow >= 1.0 ? 1.0 : confidence_sm;

//	#ifdef DRAW_CONFIDENCE
//		const float coef_confidence_color = 1.0;
//		vec4 confidence_color = vec4(GREEN + RED) * confidence_sm * coef_confidence_color;
//		/*
//		confidence_color = confidence_sm >= 1.0 ? GREEN 	: 
//					confidence_sm < 0.0 ? BLUE	:
//					confidence_color;
//		*/
//		// - on veut afficher la grille sur les texels ombrés
//		out_color += shadow < (1-EPSILON) ? (1. - shadow) * confidence_color : vec4(0);
//		//out_color = confidence_color;
//	#endif

//	#ifdef USE_TEMPORAL_CONFIDENCE
//		vec4 	v_v4_position_in_proj_eyes_prev_normalized 	= v_v4_position_in_proj_eyes_prev / v_v4_position_in_proj_eyes_prev.w;
//			v_v4_position_in_proj_eyes_prev_normalized 	= (v_v4_position_in_proj_eyes_prev_normalized + vec4(1.)) * vec4(0.5); // [-1, +1] -> [0.0, 1.0] (Screen Space -> Texture Space)

//		// - Position Receiver
//		vec4	texel_pos_prev 	= texture2D( tex_history_positions, 			v_v4_position_in_proj_eyes_prev_normalized.xy );	// previous position 		in WorldSpace
//		// - Visibility Receiver
//		vec4	texel_vis_prev	= texture2D( tex_history_visibility, 			v_v4_position_in_proj_eyes_prev_normalized.xy );	// previous visibility 		in WorldSpace

//		// - Positions Occluders (frame courante, et précédente)
//		vec4	texel_pows_prev	= texture2D( tex_history_positions_occluders, 		v_v4_position_in_proj_eyes_prev_normalized.xy );	// previous position occluder 	in WorldSpace
//		vec4	texel_pows	= texture2D( tex_sm_pows,				texel_in_texture_light_space.xy );	// actual   position occluder 	in WorldSpace	

//		vec4 	v_v4_texel_in_world_Normalized = v_v4_texel_in_world / v_v4_texel_in_world.w;

//		vec3 	v_diff 		= texel_pos_prev.xyz - v_v4_texel_in_world_Normalized.xyz;
//		float 	distance_2 	= dot(v_diff, v_diff);
//		bool	new_receiver 	= (distance_2 >= new_texel_distance_seuil);

//		float	weight 		= pow( confidence_sm, coef_power_function );

//		#ifdef USE_EXPERIMENTAL_CORRECTION_FOR_MOVEMENT_DIFF_VIS
//			float 	variance_visibility	= abs(shadow - texel_vis_prev.x);
//			bool 	variance		= variance_visibility >= (coef_diff_for_new_texel - EPSILON);
//				new_receiver 		= IN_PENUMBRA(texel_vis_prev.x, EPSILON) && IN_PENUMBRA(shadow, EPSILON) ? new_receiver : new_receiver || variance;
//		#endif

//		bool	new_occluder = false;
//		#ifdef USE_EXPERIMENTAL_CORRECTION_FOR_MOVEMENT_DIFF_POS_OCC
//			vec3	v_diff_pows 	= texel_pows - texel_pows_prev;
//			float 	f_dist_2_pows	= dot(v_diff_pows, v_diff_pows);
//				new_occluder	= f_dist_2_pows >= coef_diff_pows;
//		#endif

//		bool new_texel 	= new_receiver || new_occluder;

//		if ( !new_texel && (texel_vis_prev.w >= (1. - EPSILON)) ) {
//			out_color = texel_vis_prev;
//		}
//		else 
//		{			
//			if (!subtexel_shadowed)
//				out_color = new_texel ? out_color : mix( texel_vis_prev, out_color, weight );	
//		}
//		//out_color = new_texel ? out_color : texel_vis_prev + out_color;
//		//out_color += texel_vis_prev;

//		//out_color = weight*out_color + (1. - weight)*texel_vis_prev;
//		//out_color = vec4(weight);
//		//out_color = new_texel ? vec4(0, 1, 0, 0) : vec4(0, 0, 0, 0);

//		// - Update History Buffers
//		// -- Positions Receiver
//		gl_FragData[1] = v_v4_texel_in_world_Normalized; 	// update history position
//		// -- Positions Casters (Occluders)
//		gl_FragData[2] = texel_pows;

//		// -
//		#ifdef DRAW_NEW_TEXEL
//			out_color = new_occluder ? vec4(0, 1, 0, 0) : out_color;
//			out_color = new_receiver ? vec4(1, 0, 0, 0) : out_color;
//			out_color = !(new_occluder || new_receiver) ? vec4(0, 0, 1, 0) : out_color;
//		#endif

//	#endif

	// -------------------------------------------------------------------------------------------------------------------------------------------------------------
	// SUBPIXEL_SHADOWED
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------		 		 	
	#ifdef USE_EXPERIMENTAL_SUBPIXEL_SHADOWED
		bool 	subpixel_proj_in_triangle,
			pixel_is_shadowed_by_plane;
		compute_subpixel( 
				// in
				texel_in_texture_light_space, 
				texel_in_projective_light_space, 
				v2_sm_size,
				v_v4_texel_in_light_space,
				// out
				subpixel_proj_in_triangle, 
				pixel_is_shadowed_by_plane
				);
		//
		bool pixel_shadowed_by_texel_sm = IN_PENUMBRA(shadow, EPSILON) || IN_HARDSHADOW(shadow, EPSILON);
		//bool bad_self_shadow = ;
		out_color.y = pixel_is_shadowed_by_plane;
		out_color.z = pixel_shadowed_by_texel_sm;
		out_color.w = subpixel_proj_in_triangle;
	#endif
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------		 

	#ifdef DRAW_CONFIDENCE
		const float coef_confidence_color = 1.0;
		vec4 confidence_color = vec4(GREEN + RED) * confidence_sm * coef_confidence_color;
		/*
		confidence_color = confidence_sm >= 1.0 ? GREEN 	: 
					confidence_sm < 0.0 ? BLUE	:
					confidence_color;
		*/
		// - on veut afficher la grille sur les texels ombrés
		out_color += shadow < (1-EPSILON) ? (1. - shadow) * confidence_color : vec4(0);
		//out_color = confidence_color;
	#endif

	// - DEBUG - FILTERS (Clamp, ISOs)
	#ifdef DRAW_FILTER_COLOR
		const float coef_iso_color = 1.0;
		vec4 iso_color = filterColor( shadow ) * coef_iso_color;
		out_color = length(iso_color) >= EPSILON ? iso_color : out_color;
	#endif

	// - DEBUG - GRID
	#ifdef DRAW_GRID
		const float coef_grid_color = 1.0;
		float grid_sm = Compute_Grid( vec2(texel_in_texture_light_space), v2_sm_size );
		//out_color += coef_grid_color * ( /**(out_color.x >= -EPSILON) && /**/ (out_color.x <= EPSILON*20000 ) ? (BLUE + GREEN) * grid_sm : out_color);
		vec4 grid_color = (BLUE + GREEN) * grid_sm * coef_grid_color;
		// - on veut afficher la grille sur les texels ombrés
		out_color += shadow < (1-EPSILON) ? (1. - shadow) * grid_color : vec4(0);
	#endif

	//vec4 depth_position_occluder = texture2D(tex_depth, texel_in_texture_light_space);
	//out_color = depth_position_occluder;

	//float d = max(0.0, dot(normalize(lightDir), normal));
	//out_color = out_color * d;
	//out_color = color * d;

	// Write result color
	//gl_FragColor = out_color;

	// Write result
	// gl_FragData[0] : Visibility Buffer
	// gl_FragData[1] : World Space Position
	gl_FragData[0] = out_color;
}

bool Point_In_Triangle_2D( in vec2 A, in vec2 B, in vec2 C, in vec2 P) {
	// Compute vectors        
	vec2 v0 = C - A;
	vec2 v1 = B - A;
	vec2 v2 = P - A;

	// Compute dot products
	float dot00 = dot(v0, v0);
	float dot01 = dot(v0, v1);
	float dot02 = dot(v0, v2);
	float dot11 = dot(v1, v1);
	float dot12 = dot(v1, v2);

	// Compute barycentric coordinates
	float invDenom = 1. / (dot00 * dot11 - dot01 * dot01);
	float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
	float v = (dot00 * dot12 - dot01 * dot02) * invDenom;

	// Check if point is in triangle
	return 	(u >= (0. - EPSILON)) && 
		(v >= (0. - EPSILON)) && 
		((u + v) <= (1. + EPSILON));
}

vec3 Line_Intersect_Triangle( vec3 A, vec3 B, vec3 C, vec3 P0, vec3 P1) 
{
	vec3    u, v, n;             // triangle vectors
	vec3    dir, w0, w;          // ray vectors
	float   r, a, b;             // params to calc ray-plane intersect
	vec3	I;

	// get triangle edge vectors and plane normal
	u = B - A;
	v = C - A;
	n = cross(u, v);             // cross product
//	if (n == (Vector)0)            // triangle is degenerate
//	return -1;                 // do not deal with this case


	dir = P1 - P0;             // ray direction vector
	w0 = P0 - A;
	a = -dot(n,w0);
	b = dot(n,dir);
//	if (fabs(b) < SMALL_NUM) {     // ray is parallel to triangle plane
//	if (a == 0)                // ray lies in triangle plane
//	    return 2;
//	else return 0;             // ray disjoint from plane
//	}

	// get intersect point of ray with triangle plane
	r = a / b;
//	if (r < 0.0)                   // ray goes away from triangle
//	return 0;                  // => no intersect
	// for a segment, also test if (r > 1.0) => no intersect

	I = P0 + r * dir;           // intersect point of ray and plane

	return I;
}

float Compute_Confidence( vec4 texel_in_texture_light_space, vec2 _sizeTexture )
{
	float tex_width = _sizeTexture.x;
	float tex_height = _sizeTexture.y;
	
	// MOG: réfléchir à ce que ça fait ce calcul !!!
	// Grille de projection de la shadow map (i.e grille de rasterisation projetée sur la scene)
	/**
	vec2 confidence_sm = texel_in_texture_light_space * _sizeTexture;
	confidence_sm = abs( floor(confidence_sm - vec2(0.5)) - 0.5);
	//
	float coef_confidence 	= 1. - max(confidence_sm.x, confidence_sm.y) * 2.0;
	/**/
	//
	
	// Grille de projection de la shadow map (i.e grille de rasterisation projetée sur la scene)
	/**/
	vec2 confidence_sm 	= vec2(texel_in_texture_light_space) * _sizeTexture;
	vec2 confidence_sm_bias = confidence_sm; //- vec2(0.5) * 0;	// erreur de MERDE: pas de bias !!!
	confidence_sm 		= abs((confidence_sm_bias - floor(confidence_sm_bias)) - vec2(0.5));
	//
	float coef_confidence 	= 1. - max(confidence_sm.x, confidence_sm.y) * 2.0;
	/**/
	
	#ifdef CLAMP_COEF_CONFIDENCE
		coef_confidence = coef_confidence < clamp_confidence_seuil ? 0.0 : 1.0;
	#endif

	#ifdef USE_RADIUS_CONFIDENCE
		float l_conf_sm 	= length(confidence_sm);
		coef_confidence 	= 1.0 - (l_conf_sm <= radius_conf ? smoothstep(0., radius_conf, l_conf_sm) : 1.0);
	#endif

	#ifdef REMAP_COEF_CONFIDENCE
		coef_confidence = abs(coef_confidence - coef_conf_min) / (1.0 - coef_conf_min);
	#endif
	return coef_confidence;
	}

void 	compute_subpixel(
		in vec4 texel_in_texture_light_space, in vec4 texel_in_projective_light_space, in vec2 _sizeTexture, in vec4 v_v4_texel_in_light_space,
		out bool subpixel_proj_in_triangle, out bool pixel_is_shadowed_by_plane
	)
{
	/**/
	vec4 v_vertex0 = texture2D(tex_sm_triangle_vertex0, vec2(texel_in_texture_light_space) );
	vec4 v_vertex1 = texture2D(tex_sm_triangle_vertex1, vec2(texel_in_texture_light_space) );
	vec4 v_vertex2 = texture2D(tex_sm_triangle_vertex2, vec2(texel_in_texture_light_space) );

	vec3 	v_v01 		= v_vertex1 - v_vertex0;
	vec3 	v_v02 		= v_vertex2 - v_vertex0;
	vec3	v_normal_tri	= cross(v_v01, v_v02);
	
	float 	dot_pixel_plane 		= dot( v_vertex0 - v_v4_texel_in_light_space, v_normal_tri );
		pixel_is_shadowed_by_plane 	= (dot_pixel_plane >= +EPSILON); //&& (dot_pixel_plane >= -EPSILON);

	v_vertex0 = u_m4_light_proj * v_vertex0;
	v_vertex0 /= v_vertex0.w;
	v_vertex1 = u_m4_light_proj * v_vertex1;
	v_vertex1 /= v_vertex1.w;
	v_vertex2 = u_m4_light_proj * v_vertex2;
	v_vertex2 /= v_vertex2.w;
		
	//	float	aire_triangle 	= 0.5 * length(cross(v_v01, v_v02));	
//	float 	aire_texel	= pow( 1.0/_sizeTexture.x, 2. );

	subpixel_proj_in_triangle = Point_In_Triangle_2D( v_vertex0, v_vertex1, v_vertex2, texel_in_projective_light_space );

	//coef_confidence = (subtexel_shadowed ? 1. : coef_confidence);
	
	//coef_confidence = aire_triangle / aire_texel;

	/**/
	//return subtexel_shadowed;
}

// Shadow Texture 2D
vec4 interpolate_bicubic_fast(sampler2DShadow tex_depth_map, vec3 _texCoord, vec2 _sizeTexture)
{
	float 	x = _texCoord.x * _sizeTexture.x,
		y = _texCoord.y * _sizeTexture.y,
		z = _texCoord.z;
	
	// transform the coordinate from [0,extent] to [-0.5, extent-0.5]
	vec2 vec_bias 	= vec2(0.5);
	vec2 coord_grid = vec2(x, y) - vec_bias;
	vec2 index 	= floor(coord_grid); 		// nearest integer
	vec2 fraction 	= coord_grid - index;		//
	vec2 one_frac 	= 1.0 - fraction;
	
	// bspline_weights(fraction, w0, w1, w2, w3);
	vec2 w0 = 1.0/6.0 * one_frac*one_frac*one_frac;
	vec2 w1 = 2.0/3.0 - 0.5 * fraction*fraction*(2.0-fraction);
	vec2 w2 = 2.0/3.0 - 0.5 * one_frac*one_frac*(2.0-one_frac);
	vec2 w3 = 1.0/6.0 * fraction*fraction*fraction;

	vec2 g0 = w0 + w1;
	vec2 g1 = w2 + w3;
	vec2 h0 = (w1 / g0) - vec2(0.5) + index;  //h0 = w1/g0 - 1, move from [-0.5, extent-0.5] to [0, extent]
	vec2 h1 = (w3 / g1) + vec2(1.5) + index;  //h1 = w3/g1 + 1, move from [-0.5, extent-0.5] to [0, extent]
	
	//
	h0 /= _sizeTexture;
	h1 /= _sizeTexture;
	
	// fetch the four linear interpolations
	
	vec4 tex00 = shadow2D(tex_depth_map, vec3(h0.x, h0.y, z) );
	vec4 tex10 = shadow2D(tex_depth_map, vec3(h1.x, h0.y, z) );
	vec4 tex01 = shadow2D(tex_depth_map, vec3(h0.x, h1.y, z) );
	vec4 tex11 = shadow2D(tex_depth_map, vec3(h1.x, h1.y, z) );

	// weigh along the y-direction
	tex00 = mix(tex01, tex00, g0.y);
	tex10 = mix(tex11, tex10, g0.y);

	// weigh along the x-direction
	return mix(tex10, tex00, g0.x);
}

// Texture 2D
vec4 interpolate_bicubic_fast(sampler2D tex, vec2 _texCoord, vec2 _sizeTexture)
{
	float 	x = _texCoord.x * _sizeTexture.x,
		y = _texCoord.y * _sizeTexture.y;
	 
	// transform the coordinate from [0,extent] to [-0.5, extent-0.5]
	vec2 vec_bias 	= vec2(0.5);
	vec2 coord_grid = vec2(x, y) - vec_bias;
	vec2 index 	= floor(coord_grid); 		// nearest integer
	vec2 fraction 	= coord_grid - index;		//
	vec2 one_frac 	= 1.0 - fraction;
	
	// bspline_weights(fraction, w0, w1, w2, w3);
	vec2 w0 = 1.0/6.0 * one_frac*one_frac*one_frac;
	vec2 w1 = 2.0/3.0 - 0.5 * fraction*fraction*(2.0-fraction);
	vec2 w2 = 2.0/3.0 - 0.5 * one_frac*one_frac*(2.0-one_frac);
	vec2 w3 = 1.0/6.0 * fraction*fraction*fraction;

	vec2 g0 = w0 + w1;
	vec2 g1 = w2 + w3;
	vec2 h0 = (w1 / g0) - vec2(0.5) + index;  //h0 = w1/g0 - 1, move from [-0.5, extent-0.5] to [0, extent]
	vec2 h1 = (w3 / g1) + vec2(1.5) + index;  //h1 = w3/g1 + 1, move from [-0.5, extent-0.5] to [0, extent]
	
	//
	h0 /= _sizeTexture;
	h1 /= _sizeTexture;
	
	// fetch the four linear interpolations
	vec4 tex00 = texture2D(tex, vec2(h0.x, h0.y) );
	vec4 tex10 = texture2D(tex, vec2(h1.x, h0.y) );
	vec4 tex01 = texture2D(tex, vec2(h0.x, h1.y) );
	vec4 tex11 = texture2D(tex, vec2(h1.x, h1.y) );

	// weigh along the y-direction
	tex00 = mix(tex01, tex00, g0.y);
	tex10 = mix(tex11, tex10, g0.y);

	// weigh along the x-direction
	return mix(tex10, tex00, g0.x);
}

float Compute_Grid( vec2 texel_in_texture_light_space, vec2 _sizeTexture )
{
	float tex_width = _sizeTexture.x;
	float tex_height = _sizeTexture.y;
	
	// Grille de projection de la shadow map (i.e grille de rasterisation projetée sur la scene)
	float grid_sm_x = texel_in_texture_light_space.x * tex_width;
	//grid_sm_x -= 0.5;
	grid_sm_x -= floor(grid_sm_x);
	grid_sm_x = 1. - grid_sm_x;
	
	float grid_sm_y = texel_in_texture_light_space.y * tex_height;
	//grid_sm_y -= 0.5;
	grid_sm_y -= floor(grid_sm_y);	
	grid_sm_y = 1. - grid_sm_y;
	//
	float grid_sm;
	//grid_sm = smoothstep( -0.5, +0.5, grid_sm_x * grid_sm_y );
	grid_sm = grid_sm_x * grid_sm_y;
	//
	return grid_sm;
	}
	
vec4 filterColor( in float coef_shadow )
{
	vec4 iso_color;
	
	// exhibe 3 frontières (3 courbes iso)
	/**/
	//const float fCoef_Width = 0.5;
	const float fCoef_Width = 0.1;
	vec3 v3CoefISOs;
	//
	v3CoefISOs.x = smoothstep( 0. + EPSILON, 0. + fCoef_Width, coef_shadow);
	v3CoefISOs.y = smoothstep( 1. - fCoef_Width, 1.0 - (0.04), coef_shadow);
	v3CoefISOs.z = smoothstep( .5 - (fCoef_Width/1.), .5 + (fCoef_Width/1.), coef_shadow);
	//
	v3CoefISOs = vec3(1.) - abs((v3CoefISOs*vec3(2.)) - vec3(1.));
	//
	iso_color += v3CoefISOs.x * RED;
	iso_color += v3CoefISOs.y * GREEN;
	iso_color += v3CoefISOs.z * BLUE;
	//
	//iso_color *= coef_iso_color;
	//
	//out_color = length(iso_color) > 0.0 ? iso_color : out_color;
	/**/
	
	/**
	vec4 out_color_iso05 = smoothstep( vec4(0.5-0.04), vec4(0.5+0.04), out_color ) * vec4(0, 0, 1, 0);
	out_color = mix( out_color_iso05, out_color, abs( out_color.x - 0.5) > 0.04);
	/**/
	
	/**
	float coef_clamp = 0.5;
	out_color = step( coef_clamp, out_color );
	/**/
	
	//return out_color;
	return iso_color;
	}
