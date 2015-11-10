#ifndef __HELPER_VIEWER_UPDATE__
#define __HELPER_VIEWER_UPDATE__

#include <Vec3.h>
#include <Params.h>
//
	        
void Viewer::updateFrameBuffers() {
    update_matrix();
    MSG_CHECK_GL;

    // - FRAME_BUFFERS: Maj des FBs et Render-Textures associées
    updateShadowMap( fb_depth_shadow_map );

    // - TIMER_QUERY
    //
    if ( PARAM(bool, timer_query.print) ) {
        GLdouble dTimeElapsed_USM = tq_update_shadow_map.getTimeElapsed() / 1.e6;
        GLdouble dTimeElapsed_USCM = tq_update_shadow_clip_map.getTimeElapsed() / 1.e6;
        fprintf(stdout, "# Timer_Query Update Shadow Map - Update Shadow ClipMap: %2.4lfms - %2.4lfms\r", dTimeElapsed_USM, dTimeElapsed_USCM ); // affiche en millisecondes
    }
}

void Viewer::updateShadowMap( FrameBuffer& _framebuffer	) {
    const GLenum clearBufferBits = GL_DEPTH_BUFFER_BIT | GL_COLOR_BUFFER_BIT;
    const GLboolean colorMask[] = {~0x0, ~0x0, ~0x0, ~0x0};

    glPushAttrib( GL_ALL_ATTRIB_BITS );
        _framebuffer.activate();
            glViewport(0, 0, _framebuffer.width(), _framebuffer.height());

            setOpenGLStates();

            glColorMask( colorMask[0], colorMask[1], colorMask[2], colorMask[3] );
            glClear( clearBufferBits );

            // Set light's camera (OpenGL 1.x style)
            // Sauvegarde des matrices de transformations
            glMatrixMode(GL_PROJECTION);
            glPushMatrix();
            pt_light_to_projective.glLoadProjection();

            glMatrixMode(GL_MODELVIEW);
            glPushMatrix();
            pt_world_to_light.glLoadModelView();

            // -- Render front or back face
            glEnable(GL_CULL_FACE);
            if (PARAM(bool, shadow_map.use_back_face)) {
                glCullFace(GL_FRONT);
            }
            else {
                glCullFace(GL_BACK);
            }

            // Draw scene occluders
            vbo->setProg( prog_vbo_dsm );
            prog_vbo_dsm.activate();
                // LIGHT POSITION
                prog_vbo_dsm.setUniformVec3( "u_v3_light_pos_in_object", Vec3(v4_light_position_in_object_vbo), true);
                prog_vbo_dsm.setUniform("u_f_seuil_iso", PARAM(float, vbo.coef_seuil_iso));
                // RENDER
                if ( !PARAM(bool, vbo.enable_cull_face) )
                    glDisable(GL_CULL_FACE);
                glMatrixMode(GL_MODELVIEW);
                glPushMatrix();
                    // MODEL_SPACE -> WORLD_SPACE
                    pt_object_to_world_vbo.glMultModelView();
                    vbo->render(GL_TRIANGLES, indexBuffer);
                glPopMatrix();
            prog_vbo_dsm.deactivate();

            // Restore the OpenGL Matrix
            glMatrixMode(GL_PROJECTION);
            glPopMatrix();
            glMatrixMode(GL_MODELVIEW);
            glPopMatrix();
            //
        _framebuffer.deactivate();
    glPopAttrib();
}
#endif
