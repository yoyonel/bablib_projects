#extension GL_EXT_gpu_shader4 : enable

#define DEPTH_BIAS	(-0.015 * 4.)

#define GREEN	vec4( 0, 1, 0, 0 )
#define RED		vec4( 1, 0, 0, 0 )
#define BLUE	vec4( 0, 0, 1, 0 )

#define EPSILON		0.000001		//@@ trouver l'epsilon des floats (autour de 0.)


#define IN_PENUMBRA(_coef_shadow, _seuil) ( ( (_coef_shadow) >= (_seuil) ) && ( (_coef_shadow) <= (1.0 - _seuil) ) )


//#define USE_SHADOW_PROJ
#define USE_SHADOW_PCF		0
#define USE_SHADOW_BICUBIC	1

#define SHADOW_TECHNIQUE	USE_SHADOW_PCF
//#define SHADOW_TECHNIQUE	USE_SHADOW_BICUBIC

//#define DRAW_GRID
//#define DRAW_CONFIDENCE
//#define DRAW_FILTER_COLOR

#define USE_TEMPORAL_CONFIDENCE
#define DRAW_NEW_TEXEL

//#define CLAMP_COEF_SHADOW
//float 	clamp_coef_shadow_seuil 	= 0.09;

float	new_texel_distance_seuil	= 0.001; 	// si valeur trop grande, les pixels de bord prennent le dessus

float	coef_power_function 		= 7.0;

//#define CLAMP_COEF_CONFIDENCE
float	clamp_confidence_seuil 		= 0.85;

//#define USE_RADIUS_CONFIDENCE
float radius_conf 	= 0.7;

#define USE_EXPERIMENTAL_CORRECTION_FOR_MOVEMENT_DIFF_VIS
float	coef_diff_for_new_texel	= 0.5;

// - SAMPLERs
uniform sampler2DShadow	shadowMap;

// - les textures tex_history_* pointent sur les résultats précédents
uniform sampler2D tex_history_visibility;
uniform sampler2D tex_history_positions;

// - TAILLES DES TEXTURES
uniform vec2 	v2_sm_size;

// - BIAS SHADOW MAP (uniform)
uniform float 	coef_depth_bias;

// Current vertex varying attributes for fragment shader
varying vec4 texelLightSpace;
varying vec4 texelWorldSpace;
//
varying vec4 position_prev;
//
varying vec3 normal;
varying vec4 color;
varying vec3 lightDir;

uniform	mat4	u_m4_world_light;	// Uniform Matrix World to LightSpace

// - Prototypes - Fonctions
vec4 	interpolate_bicubic_fast(sampler2DShadow tex_depth_map, vec3 _texCoord, vec2 _sizeTexture);
//
float 	Compute_Grid( vec2 texelTextureLightSpace, vec2 _sizeTexture );
vec4	filterColor( in float coef_shadow );
float 	Compute_Confidence( vec4 texelTextureLightSpace, vec4 texelLightNormalized, vec2 _sizeTexture );
//

void main(void) {

	vec4 texelTextureLightSpace;

	#ifdef USE_SHADOW_PROJ
		texelTextureLightSpace = texelLightSpace;
		// Bias Uniform (non normalisé)
		texelTextureLightSpace.z += coef_depth_bias*texelLightSpace.w;
	#else
		// Normalisation manuelle (TODO: voir shadow2DProj)
		vec4 texelLightSpaceNormalized = texelLightSpace/texelLightSpace.w;

		// Bias Uniform (TODO: voir Gradient Shadow Map)
		texelLightSpaceNormalized.z	+= coef_depth_bias;

		// Light_Space to Texture_Space(_light)
		texelTextureLightSpace = (texelLightSpaceNormalized + vec4(1.) ) * vec4(0.5);
	#endif
	
	float shadow;
	#if (SHADOW_TECHNIQUE == USE_SHADOW_PCF)
		// Depth Test (ShadowMap)
		// - with PCF 2x2 if filter_mode = GL_LINEAR, work on ATI)
		// - NEAREST mode if filter_mode = GL_NEAREST	
		float shadow_PCF;
		#ifdef USE_SHADOW_PROJ
			shadow_PCF = shadow2DProj( shadowMap, texelTextureLightSpace ).r;	
		#else
	 		shadow_PCF = shadow2D(shadowMap, vec3(texelTextureLightSpace)).r;
	 	#endif
		shadow = shadow_PCF;
	#elif (SHADOW_TECHNIQUE == USE_SHADOW_BICUBIC)
		float shadow_BiCubic = interpolate_bicubic_fast( shadowMap, vec3(texelTextureLightSpace), v2_sm_size ).x;
		shadow = shadow_BiCubic;
	#endif

		
	vec4 out_color;
	
	out_color = vec4( shadow );
	
	#ifdef CLAMP_COEF_SHADOW
		out_color = shadow >= clamp_coef_shadow_seuil ? vec4(1.) : vec4(0.);
	#endif
	
	float confidence_sm = Compute_Confidence( texelTextureLightSpace, texelLightSpaceNormalized, v2_sm_size );

	#ifdef DRAW_CONFIDENCE
		const float coef_confidence_color = 1.0;
		vec4 confidence_color = vec4(BLUE + GREEN + RED) * confidence_sm * coef_confidence_color;
		// - on veut afficher la grille sur les texels ombrés
		out_color += shadow < (1.0 - EPSILON) ? (1. - shadow) * confidence_color : vec4(0.0);
	#endif

	#ifdef USE_TEMPORAL_CONFIDENCE
		//
		vec4 position_prev_normalized = position_prev/position_prev.w;
		position_prev_normalized = (position_prev_normalized + vec4(1.)) * vec4(0.5); // [-1, +1] -> [0.0, 1.0] (Screen Space -> Texture Space)
		//
		vec4 texelWorldSpace_Normalized = texelWorldSpace/texelWorldSpace.w;

		// - Position Receiver
		vec4	texel_pos_prev 	= texture2D( tex_history_positions, position_prev_normalized.xy );	// previous position in WorldSpace
		// - Visibility Receiver
		vec4	texel_vis_prev	= texture2D( tex_history_visibility, position_prev_normalized.xy );	// previous visibility in WorldSpace
		
		vec3 	v_diff 		= texel_pos_prev.xyz - texelWorldSpace_Normalized.xyz;
		float 	distance_2 	= dot(v_diff, v_diff);
		bool	new_receiver 	= (distance_2 >= new_texel_distance_seuil);

		float	weight 		= pow( confidence_sm, coef_power_function );

		#ifdef USE_EXPERIMENTAL_CORRECTION_FOR_MOVEMENT_DIFF_VIS
			float variance_visibility	= abs(shadow - texel_vis_prev.x);
			bool variance = variance_visibility >= coef_diff_for_new_texel;
			new_receiver = IN_PENUMBRA(texel_vis_prev.x, EPSILON) && IN_PENUMBRA(shadow, EPSILON) ? new_receiver : new_receiver || variance;
			// on stocke la moyenne de la variance (différence de visibilité d'une frame l'autre)
			out_color.w = clamp(variance_visibility, 0.0, 1.0);
		#endif
		// - Test de remise à 0 de l'historique
		bool new_texel 	= new_receiver;
		
		//out_color = new_texel ? out_color : mix( texel_vis_prev, out_color, weight );	
		//
		//out_color = texel_vis_prev;
		//out_color = vec4(shadow.x, 0, 0, 0);
		//out_color = vec4(shadow.x, 1.0-texel_vis_prev.x, variance_visibility, 0) * vec4(0, 1, 0, 1);
		//out_color = vec4(variance, 0, 0, 0);
		//
		//out_color.w = new_texel ? 3.0 : texel_vis_prev.w + 0.1;

		// - Update History Buffers
		// -- Positions Receiver
		// gl_FragData[1] : World Space Position
		gl_FragData[1] = texelWorldSpace_Normalized; 	// update history position
	
		// -
		#ifdef DRAW_NEW_TEXEL
			out_color = new_receiver ? vec4(1, 0, 0, 0) : vec4(0, 0, 0, 0);
		#endif
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
		float grid_sm = Compute_Grid( vec2(texelTextureLightSpace), v2_sm_size );
		//out_color += coef_grid_color * ( /**(out_color.x >= -EPSILON) && /**/ (out_color.x <= EPSILON*20000 ) ? (BLUE + GREEN) * grid_sm : out_color);
		vec4 grid_color = (BLUE + GREEN) * grid_sm * coef_grid_color;
		// - on veut afficher la grille sur les texels ombrés
		out_color += shadow < (1-EPSILON) ? (1. - shadow) * grid_color : vec4(0);
	#endif

	// Write result
	// gl_FragData[0] : Visibility Buffer
	gl_FragData[0] = out_color;
}

float Compute_Confidence( vec4 texelTextureLightSpace, vec4 texelLightSpaceNormalized, vec2 _sizeTexture )
{
	float tex_width = _sizeTexture.x;
	float tex_height = _sizeTexture.y;
	
	// Grille de projection de la shadow map (i.e grille de rasterisation projetée sur la scene)
	vec2 confidence_sm 	= vec2(texelTextureLightSpace) * _sizeTexture;
	vec2 confidence_sm_bias = confidence_sm; //- vec2(0.5) * 0;	// erreur de MERDE: pas de bias !!!
	confidence_sm 		= abs((confidence_sm_bias - floor(confidence_sm_bias)) - vec2(0.5));
	//
	float coef_confidence 	= 1. - max(confidence_sm.x, confidence_sm.y) * 2.0;

	#ifdef CLAMP_COEF_CONFIDENCE
		coef_confidence = coef_confidence < clamp_confidence_seuil ? 0.0 : 1.0;
	#endif

	#ifdef USE_RADIUS_CONFIDENCE
		float l_conf_sm 	= length(confidence_sm);
		coef_confidence 	= 1.0 - (l_conf_sm <= radius_conf ? smoothstep(0., radius_conf, l_conf_sm) : 1.0);
	#endif

	return coef_confidence;
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

float Compute_Grid( vec2 texelTextureLightSpace, vec2 _sizeTexture )
{
	float tex_width = _sizeTexture.x;
	float tex_height = _sizeTexture.y;
	
	// Grille de projection de la shadow map (i.e grille de rasterisation projetée sur la scene)
	float grid_sm_x = texelTextureLightSpace.x * tex_width;
	grid_sm_x -= floor(grid_sm_x);
	grid_sm_x = 1. - grid_sm_x;
	
	float grid_sm_y = texelTextureLightSpace.y * tex_height;
	grid_sm_y -= floor(grid_sm_y);	
	grid_sm_y = 1. - grid_sm_y;
	//
	float grid_sm;
	grid_sm = grid_sm_x * grid_sm_y;
	//
	return grid_sm;
	}
	
vec4 filterColor( in float coef_shadow )
{
	vec4 iso_color;
	
	// exhibe 3 frontières (3 courbes iso)
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
	
	return iso_color;
	}
