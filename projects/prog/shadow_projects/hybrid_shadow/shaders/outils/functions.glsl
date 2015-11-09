bool    compute_is_edge_silhouette( float f_coef0_lighting, float f_coef1_lighting, float f_seuil );

bool compute_is_edge_silhouette( float f_coef0_lighting, float f_coef1_lighting, float f_seuil ) {
    float f_ecart_iso = 0.0;

    float f_min_coefs_lighting = min( f_coef0_lighting, f_coef1_lighting );
    float f_max_coefs_lighting = max( f_coef0_lighting, f_coef1_lighting );

    float f_seuil_min = (f_seuil - (f_ecart_iso/2.));
    float f_seuil_max = (f_seuil + (f_ecart_iso/2.));

//    return (f_min_coefs_lighting <= f_seuil_min) && (f_max_coefs_lighting > f_seuil_max);
    return ((f_min_coefs_lighting - f_seuil_min) * (f_max_coefs_lighting - f_seuil_max)) <= 0;
}
