// Define used GLSL version
#version 120
//#extension GL_EXT_gpu_shader4 : enable
// http://www.opengl.org/registry/specs/EXT/geometry_shader4.txt
//  The built-in special variable gl_PrimitiveIDIn is not an array and has no
//    vertex shader equivalent. It is filled with the number of primitives
//    processed since the last time Begin was called (directly or indirectly via
//    vertex array functions).  The first primitive generated after a Begin is
//    numbered zero, and the primitive ID counter is incremented after every
//    individual point, line, or triangle primitive is processed.  For triangles
//    drawn in point or line mode, the primitive ID counter is incremented only
//    once, even though multiple points or lines may be drawn. Restarting a
//    primitive topology using the primitive restart index has no effect on the
//    primitive ID counter.

uniform sampler2D tex_scm;

uniform vec2 	v2_scm_size;
uniform vec2	v2_screen_size;

#define RENDER_SHADOW
//#define RENDER_COLOR
//#define RENDER_VARIANCE

//#define USE_FILTER_COLOR

#define USE_BILINEAR_FILTER
//#define USE_BICUBIC_FILTER

vec4 	interpolate_bicubic_fast(sampler2D tex, vec2 _texCoord, vec2 _sizeTexture);
vec4 	filterColor( vec4 out_color );

float 	coef_iso_color = 0.5;

flat varying vec4 output_color;

void main(void) {
	vec2 v2TexelPosition 	= gl_FragCoord.xy / v2_screen_size;
	
	vec4 texSample;

	#ifdef	USE_BILINEAR_FILTER
		vec4 texSample_bl 	= texture2D(tex_scm, v2TexelPosition );
		texSample 		= texSample_bl;
	#endif
	#ifdef 	USE_BICUBIC_FILTER
		vec4 texSample_bc 	= interpolate_bicubic_fast(tex_scm, v2TexelPosition, v2_scm_size );
		texSample = texSample_bc;
	#endif

	#ifdef USE_FILTER_COLOR	
		texSample = filterColor( texSample );
	#endif

	vec4 out_color = vec4(1.);

	#ifdef RENDER_COLOR
		out_color *= output_color;
	#endif

	#ifdef RENDER_SHADOW
		out_color *= texSample;
	#endif

	#ifdef RENDER_VARIANCE
		out_color *= texSample.w * vec4(0, 0, 1, 0);
	#endif
	
	gl_FragColor= out_color;
}

// Texture 2D
vec4 interpolate_bicubic_fast(sampler2D tex, vec2 _texCoord, vec2 _sizeTexture)
{
	float 	x = _texCoord.x * _sizeTexture.x,
		y = _texCoord.y * _sizeTexture.y;
	 
	// transform the coordinate from [0,extent] to [-0.5, extent-0.5]
	vec2 coord_grid = vec2(x - 0.5, y - 0.5);
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

vec4 filterColor( vec4 out_color )
{
	// exhibe 3 frontières (3 courbes iso)
	/**/
	vec4 out_color_iso0 	= abs( out_color.x - 0.05) <= 0.04 ? vec4(abs( out_color.x - 0.05) / 0.04, 0, 0, 0) : vec4(0.0);
	vec4 out_color_iso1 	= abs( out_color.x - 0.95) <= 0.04 ? vec4( 0, abs(out_color.x - 0.95) / 0.04, 0, 0) : vec4(0.0);
	vec4 out_color_iso05 	= abs( out_color.x - 0.5) <= 0.04 ? vec4( 0, 0, abs(out_color.x - 0.5) / 0.04, 0) : vec4(0.0);
	//
	vec4 iso_color = out_color_iso0 + out_color_iso1 + out_color_iso05;
	iso_color *= coef_iso_color;
	out_color = length(iso_color) > 0.0 ? iso_color : out_color;
	/**/
	return out_color;
}
