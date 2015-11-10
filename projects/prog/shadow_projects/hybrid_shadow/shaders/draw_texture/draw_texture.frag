// Define used GLSL version
#version 120

uniform sampler2D texture;

uniform float tex_width, tex_height;

vec4 interpolate_bicubic_fast(sampler2D tex, float x, float y);

void main(void) {	
	vec4 texSample_bl 	= texture2D(texture, gl_TexCoord[0].xy);
	vec4 texSample_bc 	= interpolate_bicubic_fast(texture, gl_TexCoord[0].x, gl_TexCoord[0].y );
	
	//vec4 texSample = abs( texSample_bl - texSample_bc );
	//vec4 texSample = texSample_bc;
	vec4 texSample = texSample_bl;
	
	gl_FragColor= texSample;
}
// Texture 2D
vec4 interpolate_bicubic_fast(sampler2D tex, float x, float y)
{
	// - 
	x = x * tex_width;
	y = y * tex_height;
	 
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
	h0 /= vec2( tex_width, tex_height );
	h1 /= vec2( tex_width, tex_height );
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

