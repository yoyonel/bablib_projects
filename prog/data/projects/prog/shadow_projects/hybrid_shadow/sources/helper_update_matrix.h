#ifndef __HELPER_UPDATE_MATRIX__
#define __HELPER_UPDATE_MATRIX__

//int jitter = 0;

void Viewer::update_matrix()
{
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------
	// MATRIX
	// -------------------------------------------------------------------------------------------------------------------------------------------------------------
	// -- PROJECTIVE -> TEXTURE
	pt_projective_to_texture = PARAM(bool, shadow_map.use_shadow_proj) ? ProjTransfo::scalingAndTranslation(Vec3(0.5f), Vec3(0.5f)) : ProjTransfo();

	// - LIGHT
	// -- WORLD -> LIGHT
	pt_world_to_light = ProjTransfo::getModelView( qgl_cam_light_mf );
	// -- LIGHT* -> PROJECTIVE_LIGHT -> JITTERED
	pt_light_to_projective = ProjTransfo::getProjection( qgl_cam_light_mf );
	// -- WORLD -> LIGHT* -> PROJECTIVE_LIGHT <=> MVP: ModelView + Projection
	pt_world_to_projective_light = pt_light_to_projective * pt_world_to_light;
	// -- WORLD -> LIGHT*(-> JITTER_LIGHT) -> PROJECTIVE_LIGHT -> TEXTURE_LIGHT
	pt_world_to_texture_light = pt_projective_to_texture * pt_world_to_projective_light;

	// ------- POUR CHAQUE OBJECT DE LA SCENE -------
	// -- VBO
	// OBJECT -> WORLD
	pt_object_to_world_vbo = ProjTransfo::scaling(Vec3(f_scale_vbo)) * ProjTransfo(qgl_mf_vbo.worldMatrix());
	// OBJECT -> WORLD -> LIGHT* -> PROJECTIVE_LIGHT
	pt_object_to_projective_light_vbo = pt_world_to_projective_light * pt_object_to_world_vbo;
	// OBJECT -> WORLD -> LIGHT* -> PROJECTIVE -> TEXTURE
	pt_object_to_texture_light_vbo = pt_world_to_texture_light * pt_object_to_world_vbo;
	// WORLD -> OBJECT
	pt_world_to_object_vbo = pt_object_to_world_vbo.inv();

	// -- PLANE
	// OBJECT -> WORLD
        pt_object_to_world_plane =
                ProjTransfo::rotation( -(M_PI/2), Vec3(0, 0, 1), true ) *
                ProjTransfo::scaling( Vec3(5, 5, 1) ) *
                ProjTransfo::translation( Vec3(-0.5, -0.5, -1) );
	// WORLD -> OBJECT
	pt_world_to_object_plane = pt_object_to_world_plane.inv();	
	// -----------------------------------------------

	v4_light_position_in_world 	= Vec4(Vec3(qgl_cam_light_mf.position()));

	// LIGHT POSITION IN OBJECT SPACE (VBO)
	v4_light_position_in_object_vbo = pt_world_to_object_vbo * v4_light_position_in_world;	
}

#endif
