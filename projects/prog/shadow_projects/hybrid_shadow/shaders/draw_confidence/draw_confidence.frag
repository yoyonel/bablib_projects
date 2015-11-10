// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// CONSTANTS
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
#define GREEN		vec4( 0, 1, 0, 0 )
#define RED		vec4( 1, 0, 0, 0 )
#define BLUE		vec4( 0, 0, 1, 0 )

#define EPSILON		(0.000001)		//@@ trouver l'epsilon des floats (autour de 0.)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// MACROS
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
#define NORMALIZED_VERTEX( _vertex )	( (_vertex) / (_vertex).w )
// -------------------------------------------------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// CONSTANTS FOR METHODS CHOOSE
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
//#define USE_SHADOW_PROJ

//#define CLAMP_COEF_CONFIDENCE
#define USE_SMOOTH_CONFIDENCE
//#define REMAP_COEF_CONFIDENCE

#define __USE_FILTER_COLOR__

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// COEFFICIENTS FOR OPTIMIZATIONS
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
float 	radius_conf 			= 0.9;
float 	coef_conf_min 			= 0.6;
// -------------------------------------------------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// Uniform parameters (=global)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - Uniform Vec2 (=u_v2_*)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Dimensions (width, height) de la texture: Depth Shadow Map
uniform vec2 	u_v2_size_dsm;

// Varying parameters (=vertex to fragment shader)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - Varying Vec4 (=v_v4_*)
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// -- Texel Position in Projective Light Space
varying vec4 v_v4_texel_in_proj_light;
//varying float EyeVertexZ;

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - PROTOTYPES FUNCTIONS
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
vec4 	compute_texel_coords_in_texture_light( in vec4 _v4_texel_in_light );
float 	compute_confidence( vec4 v4_texel_in_light_texture, vec2 _sizeTexture );
float 	compute_hermite(in float _t, in float _p0, in float _p1, in float _m0, in float _m1);
//
vec4 	filterColor( in float coef_shadow );

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
// - MAIN FUNCTION
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
void main(void) {

	vec4 v4_texel_in_light_texture = compute_texel_coords_in_texture_light( v_v4_texel_in_proj_light);

	float f_confidence_sm = compute_confidence( v4_texel_in_light_texture, u_v2_size_dsm ); 

	vec4 v4_out_color = vec4( f_confidence_sm );

	#ifdef __USE_FILTER_COLOR__
		float f_coef_attenuation = min( max( (1.0 - gl_FragCoord.z/gl_FragCoord.w) + 1., 0.2 ), 0.8);
//		float f_coef_attenuation = EyeVertexZ;
		v4_out_color = filterColor( v4_out_color.x );
		v4_out_color *=  f_coef_attenuation;

	#endif

	gl_FragData[0] = v4_out_color;
}

float compute_confidence( vec4 _v4_texel_in_light_texture, vec2 _sizeTexture )
{
	float tex_width = _sizeTexture.x;
	float tex_height = _sizeTexture.y;
	
	// Grille de projection de la shadow map (i.e grille de rasterisation projetée sur la scene)

	vec2 v2_confidence_sm = vec2(_v4_texel_in_light_texture) * _sizeTexture;
	vec2 v2_confidence_sm_bias = v2_confidence_sm - vec2(0.5) * 0;	// erreur de MERDE: pas de bias !!!
	v2_confidence_sm = abs((v2_confidence_sm_bias - floor(v2_confidence_sm_bias)) - vec2(0.5));
	//
	float f_coef_confidence = 1. - max(v2_confidence_sm.x, v2_confidence_sm.y) * 2;
	
	#ifdef CLAMP_COEF_CONFIDENCE
		f_coef_confidence = f_coef_confidence < clamp_confidence_seuil ? 0 : 1;
	#endif

	#ifdef USE_SMOOTH_CONFIDENCE
		float l_conf_sm 	= length(v2_confidence_sm);
		float f_coef_confidence_radius = 1 - 2*l_conf_sm;
		f_coef_confidence = l_conf_sm < 0.5 ? f_coef_confidence_radius : f_coef_confidence;
		f_coef_confidence = clamp( compute_hermite( f_coef_confidence, 0.0, 1.0, 0.5, 1.0), 0, 1 );
	#endif

	#ifdef REMAP_COEF_CONFIDENCE
		f_coef_confidence = abs(f_coef_confidence - coef_conf_min) / (1.0 - coef_conf_min);
	#endif

//	f_coef_confidence = 0.99;

	return f_coef_confidence;
}

#define HERMITE_H00(t) ( 2.*pow((t), 3) - 3.*pow((t), 2) + 1 )
#define HERMITE_H10(t) ( 1.*pow((t), 3) - 2.*pow((t), 2) + t )
#define HERMITE_H01(t) ( -2.*pow((t), 3) + 3.*pow((t), 2) )
#define HERMITE_H11(t) ( 1.*pow((t), 3) - 1.*pow((t), 2) )

float compute_hermite(in float _t, in float _p0, in float _p1, in float _m0, in float _m1)
{
	return 	HERMITE_H00(_t) * _p0 +
		HERMITE_H10(_t) * _m0 +
		HERMITE_H01(_t) * _p1 +
		HERMITE_H11(_t) * _m1;
}

vec4 compute_texel_coords_in_texture_light( in vec4 _v4_texel_in_light )
{
	vec4 v4_texel_in_light_texture;

	// Normalisation manuelle (TODO: voir shadow2DProj)
	vec4 v4_texel_in_light_proj = _v4_texel_in_light / _v4_texel_in_light.w;

	#ifdef USE_SHADOW_PROJ
		v4_texel_in_light_texture = _v4_texel_in_light;
	#else
		// Light_Space to Texture_Space(_light)
		v4_texel_in_light_texture = (v4_texel_in_light_proj + vec4(1.) ) * vec4(0.5);
	#endif

	return v4_texel_in_light_texture;
}

vec4 filterColor( in float coef_shadow )
{
	vec4 iso_color;
	
//	// exhibe 3 frontières (3 courbes iso)
//	const float fCoef_Width = 1./3.;
	const float fCoef_Width = 0.25;

	vec3 v3CoefISOs;
	//
	v3CoefISOs.x = smoothstep( 0. + EPSILON, 0. + fCoef_Width, coef_shadow);
	v3CoefISOs.y = smoothstep( 1. - fCoef_Width, 1.0 - EPSILON, coef_shadow);
	v3CoefISOs.z = smoothstep( .5 - fCoef_Width, .5 + fCoef_Width, coef_shadow);
	//
	v3CoefISOs = vec3(1.) - abs( v3CoefISOs*vec3(2.) - vec3(1.) );
	//
	iso_color += v3CoefISOs.x * RED;
	iso_color += v3CoefISOs.y * GREEN;
	iso_color += v3CoefISOs.z * BLUE;

//	iso_color += coef_shadow * RED * float(coef_shadow <= 0.33) ;
//	iso_color += coef_shadow * BLUE * float(coef_shadow >= 0.33 && coef_shadow <= 0.66);
//	iso_color += coef_shadow * GREEN * float(coef_shadow >= 0.66) ;


	return iso_color;
}
