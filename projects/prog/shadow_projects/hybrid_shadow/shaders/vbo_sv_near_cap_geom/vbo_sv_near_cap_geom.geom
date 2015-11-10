#version 130
#extension GL_EXT_geometry_shader4 : enable         

#bablib_include "../outils/defines.glsl"
#bablib_include "../outils/functions.glsl"

uniform vec3 	u_v3_light_pos_in_object;
uniform float	u_f_seuil_iso;
uniform float	u_f_coef_extrusion;

in 	vec3 v3_normal[];

vec3 	v3_vertex[3];
vec3 	v3_normals[3];
float 	f_coefs_lighting[3];
bool 	b_edges_are_silhouettes[2];
//
vec3 	v3_light_position_in_object;
//
bool 	b_is_triangle_silhouette;
//
vec3    v3_edge[2];
vec3    v3_proj_edge[2];
float   f_weights[3];

void    compute_extrusions();
void    compute_extrusions_with_caps();

void main() {
    // Light Position in Object Space
    v3_light_position_in_object 	= u_v3_light_pos_in_object;

    // On récupère les vertex du triangle rasterisé
    for(int i=0; i<3; ++i) {
        v3_vertex[i] = gl_PositionIn[i].xyz;
        v3_normals[i] = v3_normal[i];
        f_coefs_lighting[i] = COMPUTE_LIGHTING( i, u_v3_light_pos_in_object );
     }

    for(int i=0; i<2; i++)
        b_edges_are_silhouettes[i] = compute_is_edge_silhouette( f_coefs_lighting[0], f_coefs_lighting[i+1], u_f_seuil_iso );

    b_is_triangle_silhouette = b_edges_are_silhouettes[0] || b_edges_are_silhouettes[1];

    // VERTICES - OUT
    if (b_is_triangle_silhouette) {
        render_shadow_near_cap();
    }
    else {
        //
        bool b_face_is_selfshadowed = (f_coefs_lighting[0]<0) && (f_coefs_lighting[1]<0) && (f_coefs_lighting[2]<0);
        if (b_face_is_selfshadowed) { // shadowed face
            // near cap
            for(int i=0; i<3; ++i) {
                EMIT_VERTEX_V4(gl_PositionIn[i]);
            }
            EndPrimitive();
        }
    }
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------

void render_shadow_near_cap() {
    float f_coef_extrusion = u_f_coef_extrusion;

    for(int i=0; i<3; i++)
        f_weights[i] = abs(u_f_seuil_iso - f_coefs_lighting[i]);

    int id_root_vertice = 3 - (int(b_edges_are_silhouettes[0])*2 + int(b_edges_are_silhouettes[1])*1);
    id_root_vertice %= 3;

    bool b_inverse_edge = f_coefs_lighting[id_root_vertice] >= u_f_seuil_iso;

    COMPUTE_VERTEX0_EDGE( id_root_vertice, (id_root_vertice + 2) % 3 ); // - 1
    COMPUTE_VERTEX1_EDGE( id_root_vertice, (id_root_vertice + 1) % 3 ); // + 1

    COMPUTE_VERTEX0_EXTRUSION
    COMPUTE_VERTEX1_EXTRUSION

    if ( b_inverse_edge ) {                
        // Near Cap
        EMIT_VERTEX_V3(GET_VERTEX(id_root_vertice))
        EMIT_VERTEX_V3(v3_edge[1])
        EMIT_VERTEX_V3(v3_edge[0])
        EndPrimitive();
    }
    else {
        // Near Cap
        EMIT_VERTEX_V3(v3_edge[1])
        EMIT_VERTEX_V3(GET_VERTEX((id_root_vertice+1)%3))
        EMIT_VERTEX_V3(v3_edge[0])
        EMIT_VERTEX_V3(GET_VERTEX((id_root_vertice+2)%3))
        EndPrimitive();
    }
}
