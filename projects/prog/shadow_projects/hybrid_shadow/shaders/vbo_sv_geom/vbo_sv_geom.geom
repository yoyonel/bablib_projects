#version 130
#extension GL_EXT_geometry_shader4 : enable         

#bablib_include "../outils/defines.glsl"
#bablib_include "../outils/functions.glsl"

#define __RENDER_SHADOW_QUAD__
#define __RENDER_NEAR_CAP__
#define __RENDER_FAR_CAP__
//
#define __USE_ZFAIL__

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
vec3    v3_proj_edge[2];
float   f_weights[3];

void    render_shadow_volumes();
void    render_far_cap();
void    render_near_cap();

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
        render_shadow_volumes();
    }
    #ifdef __USE_ZFAIL__
    else {
        //
        bool b_face_is_selfshadowed = (f_coefs_lighting[0]<0);
        if (b_face_is_selfshadowed) {
            render_far_cap();
        }
        else {  // illuminated face
            render_near_cap();
        }
    }
    #endif
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------

void render_shadow_volumes() {
    float f_coef_extrusion = u_f_coef_extrusion;

    for(int i=0; i<3; i++)
        f_weights[i] = COMPUTE_WEIGHT(i, u_f_seuil_iso);

    int id_root_vertice = (3 - (int(b_edges_are_silhouettes[0])*2 + int(b_edges_are_silhouettes[1])*1)) % 3;
    int id_next_indice  = (id_root_vertice + 1) % 3,
        id_prev_indice  = (id_root_vertice + 2) % 3;

    COMPUTE_VERTEX0_EDGE( id_root_vertice, id_prev_indice ); // - 1
    COMPUTE_VERTEX1_EDGE( id_root_vertice, id_next_indice ); // + 1

    COMPUTE_VERTEX0_EXTRUSION
    COMPUTE_VERTEX1_EXTRUSION

    bool b_inverse_edge = f_coefs_lighting[id_root_vertice] >= u_f_seuil_iso;
    if ( b_inverse_edge ) {
        #ifdef __RENDER_SHADOW_QUAD__
            // Oriented Shadow-Quad
            EMIT_VERTEX_V3(v3_proj_edge[0])
            EMIT_VERTEX_V3(v3_edge[0])
            EMIT_VERTEX_V3(v3_proj_edge[1])
            EMIT_VERTEX_V3(v3_edge[1])
            EndPrimitive();
        #endif
        // Caps
        #ifdef __RENDER_NEAR_CAP__
            // Near Cap
            EMIT_VERTEX_V3(GET_VERTEX_V3(id_root_vertice))
            EMIT_VERTEX_V3(v3_edge[1])
            EMIT_VERTEX_V3(v3_edge[0])
            EndPrimitive();
        #endif
        #ifdef __RENDER_FAR_CAP__
            // Far Cap
            EMIT_VERTEX_V3(COMPUTE_EXTRUSION(v3_edge[1]))
            EMIT_VERTEX_V3(COMPUTE_EXTRUSION(GET_VERTEX_V3(id_next_indice)))
            EMIT_VERTEX_V3(COMPUTE_EXTRUSION(v3_edge[0]))
            EMIT_VERTEX_V3(COMPUTE_EXTRUSION(GET_VERTEX_V3(id_prev_indice)))
            EndPrimitive();
        #endif
    }
    else {
        #ifdef __RENDER_SHADOW_QUAD__
            // Oriented Shadow-Quad
            EMIT_VERTEX_V3(v3_proj_edge[0])
            EMIT_VERTEX_V3(v3_proj_edge[1])
            EMIT_VERTEX_V3(v3_edge[0])
            EMIT_VERTEX_V3(v3_edge[1])
            EndPrimitive();
        #endif
        // Caps
        #ifdef __RENDER_NEAR_CAP__
            // Near Cap
            EMIT_VERTEX_V3(v3_edge[1])
            EMIT_VERTEX_V3(GET_VERTEX_V3(id_next_indice))
            EMIT_VERTEX_V3(v3_edge[0])
            EMIT_VERTEX_V3(GET_VERTEX_V3(id_prev_indice))
            EndPrimitive();
        #endif
        #ifdef __RENDER_FAR_CAP__
            // Far Cap
            EMIT_VERTEX_V3(COMPUTE_EXTRUSION(GET_VERTEX_V3(id_root_vertice)))
            EMIT_VERTEX_V3(COMPUTE_EXTRUSION(v3_edge[1]))
            EMIT_VERTEX_V3(COMPUTE_EXTRUSION(v3_edge[0]))
            EndPrimitive();
        #endif
    }
}

void render_far_cap() {
    // far cap
    for(int i=0; i<3; ++i) {
        EMIT_VERTEX_V3( COMPUTE_VERTEX_EXTRUSION( gl_PositionIn[i].xyz, GET_LIGHT_POSITION, u_f_coef_extrusion) );
    }
    EndPrimitive();
}

void render_near_cap() {
    // near cap
    for(int i=0; i<3; ++i) {
        EMIT_VERTEX_V4(gl_PositionIn[i])
    }
    EndPrimitive();
}
