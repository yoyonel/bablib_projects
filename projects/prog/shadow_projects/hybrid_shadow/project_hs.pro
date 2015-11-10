TARGET   = View
TEMPLATE = app

CONFIG *= bablib
CONFIG *= scene3d
CONFIG *= gsl

HEADERS = sources/*.h
SOURCES = sources/*.cpp

OTHER_FILES +=                                              \
                shaders/vbo_sv0/vbo_sv0.frag                \
                shaders/vbo_sv0/vbo_sv0.vert                \
                shaders/vbo_sv1/vbo_sv1.frag                \
                shaders/vbo_sv1/vbo_sv1.vert                \
                shaders/vbo/vbo.frag                        \
                shaders/vbo/vbo.vert                        \
                shaders/vbo_dsm/vbo_dsm.frag                \
                shaders/vbo_dsm/vbo_dsm.vert                \
                shaders/draw_texture/draw_texture.frag      \
                shaders/draw_texture/draw_texture.vert      \
                shaders/vbo_sv_geom/vbo_sv_geom.frag        \
                shaders/vbo_sv_geom/vbo_sv_geom.vert        \
                shaders/vbo_sv_geom/vbo_sv_geom.geom        \
                shaders/vbo_sv_near_cap_geom/vbo_sv_near_cap_geom.frag      \
                shaders/vbo_sv_near_cap_geom/vbo_sv_near_cap_geom.vert      \
                shaders/vbo_sv_near_cap_geom/vbo_sv_near_cap_geom.geom      \
                shaders/vbo_sv_far_cap_geom/vbo_sv_far_cap_geom.frag        \
                shaders/vbo_sv_far_cap_geom/vbo_sv_far_cap_geom.vert        \
                shaders/vbo_sv_far_cap_geom/vbo_sv_far_cap_geom.geom        \
                shaders/vbo_sv_shadowquad_geom/vbo_sv_shadowquad_geom.frag  \
                shaders/vbo_sv_shadowquad_geom/vbo_sv_shadowquad_geom.vert  \
                shaders/vbo_sv_shadowquad_geom/vbo_sv_shadowquad_geom.geom  \
                shaders/outils/defines.glsl                                 \
                shaders/outils/functions.glsl                               \
                shaders/vbo_smoothies_geom/vbo_smoothies_geom.vert          \
                shaders/vbo_smoothies_geom/vbo_smoothies_geom.frag          \
                shaders/vbo_smoothies_geom/vbo_smoothies_geom.geom          \
                default.par                                 \
                notes.txt \
    shaders/outils/defines.glsl \
    shaders/outils/area_light.glsl

PROJECT_PATH = $$PWD

# http://stackoverflow.com/questions/5715543/how-to-change-qmake-release-flags-for-gcc-change-o2-to-os
QMAKE_CXXFLAGS_RELEASE -= -Wint-to-pointer-cast

include($$[QPROG]/config_project.pri)
