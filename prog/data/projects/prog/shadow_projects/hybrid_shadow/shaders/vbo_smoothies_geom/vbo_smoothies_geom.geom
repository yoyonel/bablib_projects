#version 130
#extension GL_EXT_geometry_shader4 : enable         

#bablib_include "../outils/defines.glsl"
#bablib_include "../outils/functions.glsl"

#define __RENDER_SMOOTHIES_QUAD__
//

uniform vec3 	u_v3_light_pos_in_object;   // Light Position in Object Space
uniform float	u_f_seuil_iso;
uniform float	u_f_coef_extrusion;

in 	vec3 v3_normal[];

float 	f_coefs_lighting[3];
bool 	b_edges_are_silhouettes[2];
//
bool 	b_is_triangle_silhouette;
//
vec3    v3_edge[2];
vec3    v3_proj_edge[4];
float   f_weights[3];

void    render_smoothies();

void main() {
   //
    for(int i=0; i<3; ++i) {
        f_coefs_lighting[i] = COMPUTE_LIGHTING( i, GET_LIGHT_POSITION );
     }

    for(int i=0; i<2; i++)
        b_edges_are_silhouettes[i] = compute_is_edge_silhouette( f_coefs_lighting[0], f_coefs_lighting[i+1], u_f_seuil_iso );

    b_is_triangle_silhouette = b_edges_are_silhouettes[0] || b_edges_are_silhouettes[1];

    // VERTICES - OUT
    if (b_is_triangle_silhouette) {
        render_smoothies();
    }
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------

void render_smoothies() {
    float f_coef_extrusion = u_f_coef_extrusion;

    // poids: proportionnel à la distance au seuil
    for(int i=0; i<3; i++)
        f_weights[i] = COMPUTE_WEIGHT(i, u_f_seuil_iso);

    int id_root_vertice = (3 - (int(b_edges_are_silhouettes[0])*2 + int(b_edges_are_silhouettes[1])*1)) % 3;
    int id_next_indice  = (id_root_vertice + 1) % 3,
        id_prev_indice  = (id_root_vertice + 2) % 3;   

    // calcul des sommets de l'edge: v3_edge[0|1]
    COMPUTE_VERTEX0_EDGE( id_root_vertice, id_prev_indice ); // - 1
    COMPUTE_VERTEX1_EDGE( id_root_vertice, id_next_indice ); // + 1

    vec3 pos_smoothies;
    //pos_smoothies = vec3(gl_ModelViewMatrixInverse * vec4(0, 0, 0, 1)); // camera
    pos_smoothies = u_v3_light_pos_in_object;   // light

    // calcul de la normale de l'edge
    vec3 v3_normal_obj = normalize(cross(v3_edge[0] - pos_smoothies, v3_edge[1] - v3_edge[0]));

    // calcul de la projection sommets de l'edge par rapport à la normale: v3_proj_edge[0|1]
    v3_proj_edge[0] = v3_edge[0] + v3_normal_obj * f_coef_extrusion;
    EMIT_VERTEX_V3(v3_proj_edge[0]);
    v3_proj_edge[1] = v3_edge[1] + v3_normal_obj * f_coef_extrusion;
    EMIT_VERTEX_V3(v3_proj_edge[1]);
    v3_proj_edge[2] = v3_edge[0] - v3_normal_obj * f_coef_extrusion;
    EMIT_VERTEX_V3(v3_proj_edge[2]);
    v3_proj_edge[3] = v3_edge[1] - v3_normal_obj * f_coef_extrusion;
    EMIT_VERTEX_V3(v3_proj_edge[3]);
}
