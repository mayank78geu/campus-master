package com.campusmaster.campusmaster.dto.course;

import com.campusmaster.campusmaster.entity.Unit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitResponse {
    private Long id;
    private String title;
    private int sortOrder;

    public static UnitResponse fromEntity(Unit unit) {
        return UnitResponse.builder()
            .id(unit.getId())
            .title(unit.getTitle())
            .sortOrder(unit.getSortOrder())
            .build();
    }
}
